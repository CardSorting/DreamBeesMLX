package com.dreambees.android.infrastructure

import android.content.Context
import com.dreambees.android.domain.models.AspectRatio
import com.dreambees.android.domain.models.DreamBeeModel
import com.dreambees.android.domain.models.DreamTrailMode
import com.dreambees.android.domain.models.GenerationHistoryItem
import com.dreambees.android.domain.models.GenerationRequest
import com.dreambees.android.domain.models.GenerationStage
import com.dreambees.android.domain.models.UserWallet
import com.dreambees.android.domain.repositories.DreamBeesRepository
import com.google.android.gms.tasks.Task
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.*
import java.util.Date
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class FirebaseDripDreamBeesRepository(private val context: Context) : DreamBeesRepository, java.io.Closeable {
    private val auth = FirebaseAuth.getInstance()
    private val firestore = FirebaseFirestore.getInstance()
    // SupervisorJob so child coroutine failures don't cancel sibling jobs.
    // Must be closed via close() to prevent memory leaks when the repository
    // is no longer needed (e.g. on Activity/ViewModel destruction).
    private val supervisorJob = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.Main + supervisorJob)

    private val dripIntervalMs = 60 * 1000L // 1 minute — 1 Zap per minute
    private val maxZaps = 10.0

    init {
        // Gated strictly behind Google Sign-In. No automatic anonymous sessions.
    }

    /** Release the internal CoroutineScope. Call this when the repository is no longer needed. */
    override fun close() {
        supervisorJob.cancel()
    }
    
    // Helper to await Task results cleanly in coroutines
    private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { continuation ->
        addOnCompleteListener { task ->
            if (task.isSuccessful) {
                continuation.resume(task.result)
            } else {
                continuation.resumeWithException(task.exception ?: RuntimeException("Firebase Task failed"))
            }
        }
    }
    
    fun getCurrentUserId(): String? = auth.currentUser?.uid
    fun isGuestAccount(): Boolean = auth.currentUser?.isAnonymous == true
    fun isUserSignedIn(): Boolean = auth.currentUser != null
    
    suspend fun signInAnonymously(): FirebaseUser? {
        val result = auth.signInAnonymously().await()
        return result.user
    }
    
    suspend fun signInWithEmail(email: String, pass: String): FirebaseUser? {
        val result = auth.signInWithEmailAndPassword(email, pass).await()
        return result.user
    }
    
    suspend fun signUpWithEmail(email: String, pass: String): FirebaseUser? {
        val result = auth.createUserWithEmailAndPassword(email, pass).await()
        return result.user
    }
    
    suspend fun linkGuestAccount(email: String, pass: String): FirebaseUser? {
        val currentUser = auth.currentUser ?: throw IllegalStateException("No guest user to link credentials to")
        val credential = com.google.firebase.auth.EmailAuthProvider.getCredential(email, pass)
        val result = currentUser.linkWithCredential(credential).await()
        return result.user
    }
    
    suspend fun initializeUser(): Boolean = true
    
    suspend fun logout() {
        auth.signOut()
    }
    
    fun observeWallet(uid: String, onUpdate: (UserWallet) -> Unit): ListenerRegistration {
        var tickerJob: Job? = null

        val docRef = firestore.collection("mobile_users").document(uid)
        val registration = docRef.addSnapshotListener { snapshot, error ->
            tickerJob?.cancel()

            if (error != null) {
                android.util.Log.e("DripRepo", "Wallet listener error: ${error.message}")
                return@addSnapshotListener
            }

            if (snapshot == null || !snapshot.exists()) {
                // First time this user opens the app — bootstrap the wallet document.
                val initialData = hashMapOf(
                    "zaps" to maxZaps,
                    "lastDripTime" to com.google.firebase.Timestamp.now(),
                    "tier" to "mobile_free"
                )
                docRef.set(initialData)
                    .addOnFailureListener { e ->
                        android.util.Log.e("DripRepo", "Failed to initialize wallet: ${e.message}")
                    }
                return@addSnapshotListener
            }

            val dbZaps = snapshot.getDouble("zaps") ?: maxZaps
            val dbLastDrip = snapshot.getTimestamp("lastDripTime") ?: com.google.firebase.Timestamp.now()

            // Start a display-only drip ticker. This coroutine ONLY updates the UI callback;
            // it never writes to Firestore. The authoritative credit deduction and drip
            // catch-up happen atomically inside the Firestore transaction in
            // createGenerationWithProgress(). This separation ensures the UI is
            // responsive without creating a race with the server transaction.
            tickerJob = scope.launch {
                var currentZaps = dbZaps
                var lastDripTimeMs = dbLastDrip.toDate().time

                while (isActive) {
                    val now = System.currentTimeMillis()

                    // Compute the display-only drip catch-up for the UI counter.
                    if (currentZaps < maxZaps) {
                        val elapsedMs = now - lastDripTimeMs
                        if (elapsedMs >= dripIntervalMs) {
                            val dripCount = (elapsedMs / dripIntervalMs).toInt()
                            currentZaps = (currentZaps + dripCount).coerceAtMost(maxZaps)
                            lastDripTimeMs = if (currentZaps == maxZaps) {
                                now
                            } else {
                                lastDripTimeMs + dripCount * dripIntervalMs
                            }
                            // NOTE: We intentionally do NOT write to Firestore here.
                            // The Firestore transaction is the single source of truth.
                        }
                    } else {
                        lastDripTimeMs = now
                    }

                    val nextDripSeconds = if (currentZaps >= maxZaps) {
                        0
                    } else {
                        val remainingMs = (lastDripTimeMs + dripIntervalMs) - System.currentTimeMillis()
                        (remainingMs / 1000).toInt().coerceAtLeast(0)
                    }

                    onUpdate(
                        UserWallet(
                            tier = "Mobile Creator",
                            zaps = currentZaps,
                            nextDripSeconds = nextDripSeconds
                        )
                    )

                    delay(1000)
                }
            }
        }

        return object : ListenerRegistration {
            override fun remove() {
                tickerJob?.cancel()
                registration.remove()
            }
        }
    }
    
    fun observeHistory(uid: String, onUpdate: (List<GenerationHistoryItem>) -> Unit): ListenerRegistration {
        // Simple query without compound order to avoid index creation errors
        return firestore.collection("mobile_images")
            .whereEqualTo("userId", uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    error.printStackTrace()
                    return@addSnapshotListener
                }
                
                if (snapshot != null) {
                    val items = snapshot.documents.mapNotNull { doc ->
                        try {
                            val id = doc.id
                            val prompt = doc.getString("prompt") ?: ""
                            val modelName = doc.getString("modelName") ?: ""
                            val aspectRatioStr = doc.getString("aspectRatio") ?: "Square"
                            val modeStr = doc.getString("mode") ?: "Balanced"
                            val imageUrl = doc.getString("imageUrl")
                            
                            val aspectRatio = AspectRatio.entries.find { it.name == aspectRatioStr } ?: AspectRatio.Square
                            val mode = DreamTrailMode.entries.find { it.name == modeStr } ?: DreamTrailMode.Balanced
                            
                            val createdAtTimestamp = doc.getTimestamp("createdAt")
                            val timestampMs = createdAtTimestamp?.toDate()?.time ?: System.currentTimeMillis()
                            
                            GenerationHistoryItem(
                                id = id,
                                prompt = prompt,
                                modelName = modelName,
                                aspectRatio = aspectRatio,
                                mode = mode,
                                createdAtLabel = formatTimeAgo(timestampMs),
                                imageUrl = imageUrl,
                                timestampMs = timestampMs
                            )
                        } catch (e: Exception) {
                            e.printStackTrace()
                            null
                        }
                    }
                    // Sort locally on the client by timestamp descending
                    val sortedItems = items.sortedByDescending { it.timestampMs }
                    onUpdate(sortedItems)
                }
            }
    }
    
    override suspend fun loadModels(): List<DreamBeeModel> = getBuiltInModels()
    
    override suspend fun createGeneration(request: GenerationRequest): GenerationHistoryItem {
        return createGenerationWithProgress(request) { _, _, _ -> }
    }
    
    suspend fun createGenerationWithProgress(
        request: GenerationRequest,
        onProgress: (GenerationStage, Int, String?) -> Unit
    ): GenerationHistoryItem {
        val uid = auth.currentUser?.uid ?: throw IllegalStateException("Not logged in")
        
        onProgress(GenerationStage.Submitting, 10, null)
        
        // Check and deduct zap in a Firestore transaction
        val docRef = firestore.collection("mobile_users").document(uid)
        
        withContext(Dispatchers.IO) {
            firestore.runTransaction { transaction ->
                val snapshot = transaction.get(docRef)
                if (snapshot.exists()) {
                    var zaps = snapshot.getDouble("zaps") ?: maxZaps
                    var lastDripTimeMs = snapshot.getTimestamp("lastDripTime")?.toDate()?.time ?: System.currentTimeMillis()
                    
                    // Catch up drip refilling inside the transaction to ensure zaps count is accurate
                    val now = System.currentTimeMillis()
                    if (zaps < maxZaps) {
                        val elapsedMs = now - lastDripTimeMs
                        if (elapsedMs >= dripIntervalMs) {
                            val dripCount = (elapsedMs / dripIntervalMs).toInt()
                            zaps = (zaps + dripCount).coerceAtMost(maxZaps)
                            lastDripTimeMs = if (zaps == maxZaps) {
                                now
                            } else {
                                lastDripTimeMs + dripCount * dripIntervalMs
                            }
                        }
                    } else {
                        lastDripTimeMs = now
                    }
                    
                    if (zaps < 1.0) {
                        throw RuntimeException("No Zaps left")
                    }
                    
                    // Deduct 1 zap
                    if (zaps == maxZaps) {
                        lastDripTimeMs = now
                    }
                    val newZaps = zaps - 1.0
                    
                    transaction.update(docRef, "zaps", newZaps)
                    transaction.update(docRef, "lastDripTime", Timestamp(Date(lastDripTimeMs)))
                } else {
                    throw RuntimeException("User profile missing")
                }
            }.await() // Wait for transaction completion
        }
        
        // Simulate generation preview progress updates
        delay(800)
        onProgress(GenerationStage.Queued, 30, null)
        delay(800)
        onProgress(GenerationStage.Processing, 65, request.model.imageUrl)
        delay(800)
        onProgress(GenerationStage.Finalizing, 90, request.model.imageUrl)
        delay(600)
        
        // Save the image generation item to mobile_images
        val newImageRef = firestore.collection("mobile_images").document()
        val timestampMs = System.currentTimeMillis()
        val item = GenerationHistoryItem(
            id = newImageRef.id,
            prompt = request.prompt,
            modelName = request.model.name,
            aspectRatio = request.aspectRatio,
            mode = request.mode,
            createdAtLabel = "Just now",
            imageUrl = request.model.imageUrl,
            timestampMs = timestampMs
        )
        
        val imageData = hashMapOf(
            "userId" to uid,
            "prompt" to request.prompt,
            "modelName" to request.model.name,
            "aspectRatio" to request.aspectRatio.name,
            "mode" to request.mode.name,
            "imageUrl" to request.model.imageUrl,
            "createdAt" to Timestamp(Date(timestampMs))
        )
        
        withContext(Dispatchers.IO) {
            newImageRef.set(imageData).await()
        }
        
        onProgress(GenerationStage.Complete, 100, request.model.imageUrl)
        return item
    }
    
    private fun formatTimeAgo(timestampMs: Long): String {
        val diff = System.currentTimeMillis() - timestampMs
        return when {
            diff < 60_000 -> "Just now"
            diff < 3600_000 -> "${diff / 60_000}m ago"
            diff < 86400_000 -> "${diff / 3600_000}h ago"
            else -> "${diff / 86400_000}d ago"
        }
    }
    
    private fun getBuiltInModels() = listOf(
        DreamBeeModel(
            id = "anima",
            name = "Anima",
            description = "A friendly anime illustration style and the native Android starter default.",
            imageUrl = "https://cdn.dreambeesai.com/file/printeregg/assets/models/anima.png",
            type = "Image",
            order = 1,
        ),
        DreamBeeModel(
            id = "z-image-turbo-a100",
            name = "Z-Image Turbo",
            description = "Fast iteration for playful sketches, product concepts, and quick previews.",
            imageUrl = "https://cdn.dreambeesai.com/file/printeregg/assets/models/z-image-turbo-a100.png",
            type = "Image",
            order = 2,
        ),
        DreamBeeModel(
            id = "wai-illustrious",
            name = "Wai Illustrious",
            description = "Premium illustration with polished details and high-res character energy.",
            imageUrl = "https://cdn.dreambeesai.com/file/printeregg/assets/models/wai-illustrious.png",
            type = "SDXL",
            order = 3,
        ),
        DreamBeeModel(
            id = "nova-3d-cg-xl",
            name = "Nova 3D CG XL",
            description = "Glossy 3D and CG-inspired images for mascots, objects, and dramatic lighting.",
            imageUrl = "https://cdn.dreambeesai.com/file/printeregg/assets/models/nova-3d-cg-xl.png",
            type = "Generator",
            order = 4,
        ),
        DreamBeeModel(
            id = "hassaku",
            name = "Hassaku",
            description = "Hassaku illustration style with clean lines and classical anime rendering.",
            imageUrl = "https://cdn.dreambeesai.com/file/printeregg/assets/models/hassaku.png",
            type = "Image",
            order = 5,
        ),
        DreamBeeModel(
            id = "kiwimix",
            name = "Kiwimix",
            description = "Bright anime illustration blend for vibrant characters and upbeat scenes.",
            imageUrl = "https://cdn.dreambeesai.com/file/printeregg/assets/models/kiwimix.png",
            type = "Image",
            order = 6,
        ),
        DreamBeeModel(
            id = "scyrax-pastel",
            name = "Scyrax Pastel",
            description = "Dreamy pastel palettes, soft light, and cozy fantasy atmospheres.",
            imageUrl = "https://cdn.dreambeesai.com/file/printeregg/assets/models/scyrax-pastel.png",
            type = "SDXL",
            order = 7,
        ),
        DreamBeeModel(
            id = "veretoon-v10",
            name = "Veretoon V1.0",
            description = "Clean toon-style illustrations with strong shapes and readable silhouettes.",
            imageUrl = "https://cdn.dreambeesai.com/file/printeregg/assets/models/veretoon-v10.png",
            type = "SDXL",
            order = 8,
        )
    )
}
