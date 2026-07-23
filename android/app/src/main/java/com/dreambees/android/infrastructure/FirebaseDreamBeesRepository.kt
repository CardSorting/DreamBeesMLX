package com.dreambees.android.infrastructure

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
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.PersistentCacheSettings
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.UUID
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class FirebaseDreamBeesRepository : DreamBeesRepository {

    private val auth: FirebaseAuth get() = FirebaseAuth.getInstance()
    private val firestore: FirebaseFirestore get() = FirebaseFirestore.getInstance()
    private val functions: FirebaseFunctions get() = FirebaseFunctions.getInstance()

    init {
        try {
            val cacheSettings = PersistentCacheSettings.newBuilder().build()
            val settings = FirebaseFirestoreSettings.Builder()
                .setLocalCacheSettings(cacheSettings)
                .build()
            firestore.firestoreSettings = settings
        } catch (e: Exception) {
            // Settings already applied or instance mismatch — safe to ignore
        }
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

    // AUTH ACTIONS
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
        val credential = EmailAuthProvider.getCredential(email, pass)
        val result = currentUser.linkWithCredential(credential).await()
        return result.user
    }

    suspend fun logout() {
        auth.signOut()
    }

    suspend fun initializeUser(birthday: String? = null): Boolean {
        val uid = auth.currentUser?.uid ?: return false
        val data = hashMapOf(
            "action" to "initializeUser",
            "birthday" to birthday
        )
        try {
            functions.getHttpsCallable("api").call(data).await()
            return true
        } catch (e: Exception) {
            e.printStackTrace()
            // Fallback user document creation in Firestore if initialization function fails
            val fallbackData = hashMapOf(
                "uid" to uid,
                "email" to (auth.currentUser?.email ?: ""),
                "createdAt" to Timestamp.now(),
                "zaps" to 10.0,
                "tier" to "free"
            )
            firestore.collection("users").document(uid).set(fallbackData).await()
            return true
        }
    }

    // REAL-TIME FIRESTORE DATA STREAMS
    fun observeWallet(uid: String, onUpdate: (UserWallet) -> Unit): ListenerRegistration {
        return firestore.collection("users").document(uid)
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null && snapshot.exists()) {
                    val zapsVal = snapshot.get("zaps")
                    val zapsDouble = when (zapsVal) {
                        is Number -> zapsVal.toDouble()
                        is String -> zapsVal.toDoubleOrNull()
                        else -> null
                    }
                    val tier = snapshot.getString("tier") ?: "free"
                    onUpdate(UserWallet(tier = tier, zaps = zapsDouble))
                } else {
                    onUpdate(UserWallet())
                }
            }
    }

    fun observeHistory(uid: String, onUpdate: (List<GenerationHistoryItem>) -> Unit): ListenerRegistration {
        return firestore.collection("images")
            .whereEqualTo("userId", uid)
            .orderBy("createdAt", Query.Direction.DESCENDING)
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
                            val modelId = doc.getString("modelId") ?: ""
                            val modelName = doc.getString("modelName") ?: modelId
                            val aspectRatioStr = doc.getString("aspectRatio") ?: "1:1"
                            val modeStr = doc.getString("mode") ?: "balanced"
                            val imageUrl = doc.getString("imageUrl")

                            val aspectRatio = AspectRatio.entries.find {
                                it.value == aspectRatioStr || it.name.lowercase() == aspectRatioStr.lowercase()
                            } ?: AspectRatio.Square

                            val mode = DreamTrailMode.entries.find {
                                it.name.lowercase() == modeStr.lowercase()
                            } ?: DreamTrailMode.Balanced

                            val createdAtObj = doc.get("createdAt")
                            val timestampMs = when (createdAtObj) {
                                is Timestamp -> createdAtObj.toDate().time
                                is Number -> createdAtObj.toLong()
                                else -> System.currentTimeMillis()
                            }

                            GenerationHistoryItem(
                                id = id,
                                prompt = prompt,
                                modelName = modelName,
                                aspectRatio = aspectRatio,
                                mode = mode,
                                createdAtLabel = formatTimeAgo(timestampMs),
                                imageUrl = imageUrl
                            )
                        } catch (e: Exception) {
                            e.printStackTrace()
                            null
                        }
                    }
                    onUpdate(items)
                }
            }
    }

    // BASE CONTRACT LOAD MODELS
    override suspend fun loadModels(): List<DreamBeeModel> {
        return try {
            val snapshot = firestore.collection("models").orderBy("order").get().await()
            val list = snapshot.documents.mapNotNull { doc ->
                val id = doc.id
                val name = doc.getString("name") ?: ""
                val description = doc.getString("description") ?: ""
                val imageUrl = doc.getString("imageUrl") ?: doc.getString("image") ?: ""
                val type = doc.getString("type") ?: "Image"
                val orderVal = doc.get("order")
                val order = when (orderVal) {
                    is Number -> orderVal.toInt()
                    else -> 0
                }
                val isActive = doc.getBoolean("isActive") ?: doc.getBoolean("active") ?: true
                if (isActive) {
                    DreamBeeModel(id, name, description, imageUrl, type, order, isActive)
                } else {
                    null
                }
            }
            if (list.isEmpty()) getBuiltInModels() else list
        } catch (e: Exception) {
            e.printStackTrace()
            getBuiltInModels()
        }
    }

    // BASE CONTRACT GENERATE
    override suspend fun createGeneration(request: GenerationRequest): GenerationHistoryItem {
        return createGenerationWithProgress(request) { _, _, _ -> }
    }

    // REAL-TIME GENERATION WITH LIVE PROGRESS BROADCASTING
    suspend fun createGenerationWithProgress(
        request: GenerationRequest,
        onProgress: (GenerationStage, Int, String?) -> Unit
    ): GenerationHistoryItem = suspendCancellableCoroutine { continuation ->
        val requestId = "gen_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(6)}"
        val data = hashMapOf(
            "action" to "createGenerationRequest",
            "prompt" to request.prompt,
            "modelId" to request.model.id,
            "requestId" to requestId,
            "aspectRatio" to request.aspectRatio.value,
            "mode" to request.mode.name.lowercase()
        )

        onProgress(GenerationStage.Submitting, 10, null)

        var listener: ListenerRegistration? = null
        var isCompleted = false

        // 1. Submit Request to Functions API
        functions.getHttpsCallable("api").call(data)
            .addOnFailureListener { exception ->
                if (!isCompleted) {
                    isCompleted = true
                    listener?.remove()
                    val friendlyError = parseCallableError(exception)
                    continuation.resumeWithException(RuntimeException(friendlyError))
                }
            }
            .addOnSuccessListener {
                // 2. Query/Listen Firestore Generation Queue in Real Time
                listener = firestore.collection("generation_queue").document(requestId)
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            if (!isCompleted) {
                                isCompleted = true
                                listener?.remove()
                                continuation.resumeWithException(error)
                            }
                            return@addSnapshotListener
                        }

                        if (snapshot != null && snapshot.exists() && !isCompleted) {
                            val status = snapshot.getString("status")
                            val stageStr = snapshot.getString("stage")
                            val progressVal = snapshot.get("progress")
                            val serverProgress = when (progressVal) {
                                is Number -> progressVal.toInt()
                                else -> 0
                            }

                            // Extract Preview URLs if available
                            val lqip = snapshot.getString("lqip")
                            val thumbnailUrl = snapshot.getString("thumbnailUrl")
                            val imageUrl = snapshot.getString("imageUrl")
                            val previewUrl = lqip ?: thumbnailUrl ?: imageUrl

                            // Determine Stage & Monotonic Progress
                            val stage = when (status) {
                                "queued" -> GenerationStage.Queued
                                "processing" -> {
                                    if (stageStr == "saving") GenerationStage.Finalizing else GenerationStage.Processing
                                }
                                "completed" -> GenerationStage.Complete
                                else -> GenerationStage.Submitting
                            }

                            val calculatedProgress = when (stage) {
                                GenerationStage.Idle -> 0
                                GenerationStage.Submitting -> 12
                                GenerationStage.Queued -> maxOf(25, serverProgress)
                                GenerationStage.Processing -> maxOf(55, serverProgress)
                                GenerationStage.Finalizing -> maxOf(88, serverProgress)
                                GenerationStage.Complete -> 100
                            }

                            onProgress(stage, calculatedProgress, previewUrl)

                            // Terminate successfully on "completed"
                            if (status == "completed" && imageUrl != null) {
                                isCompleted = true
                                listener?.remove()
                                continuation.resume(
                                    GenerationHistoryItem(
                                        id = requestId,
                                        prompt = request.prompt,
                                        modelName = request.model.name,
                                        aspectRatio = request.aspectRatio,
                                        mode = request.mode,
                                        createdAtLabel = "Just now",
                                        imageUrl = imageUrl
                                    )
                                )
                            } else if (status == "failed") {
                                isCompleted = true
                                listener?.remove()
                                val errorMsg = snapshot.getString("error") ?: "Image generation failed"
                                continuation.resumeWithException(RuntimeException(errorMsg))
                            }
                        }
                    }
            }

        // Clean up snapshot listener on coroutine cancellation
        continuation.invokeOnCancellation {
            isCompleted = true
            listener?.remove()
        }
    }

    private fun parseCallableError(e: Throwable): String {
        if (e is com.google.firebase.functions.FirebaseFunctionsException) {
            val cleanMessage = (e.message ?: "").replace(Regex("^[A-Z_]+\\s*:\\s*"), "").trim()
            return when (e.code) {
                com.google.firebase.functions.FirebaseFunctionsException.Code.FAILED_PRECONDITION -> 
                    cleanMessage.ifBlank { "Not enough credits to create this picture." }
                com.google.firebase.functions.FirebaseFunctionsException.Code.RESOURCE_EXHAUSTED -> 
                    cleanMessage.ifBlank { "The art studio is busy. Please try again in a moment." }
                com.google.firebase.functions.FirebaseFunctionsException.Code.UNAUTHENTICATED -> 
                    "Please sign in again."
                com.google.firebase.functions.FirebaseFunctionsException.Code.DEADLINE_EXCEEDED -> 
                    "The request timed out. Please try again."
                com.google.firebase.functions.FirebaseFunctionsException.Code.PERMISSION_DENIED -> 
                    cleanMessage.ifBlank { "You do not have permission to do that." }
                com.google.firebase.functions.FirebaseFunctionsException.Code.INTERNAL -> 
                    cleanMessage.ifBlank { "Something went wrong on our side. Please try again." }
                com.google.firebase.functions.FirebaseFunctionsException.Code.UNAVAILABLE -> 
                    cleanMessage.ifBlank { "The service is temporarily unavailable. Please try again." }
                else -> cleanMessage.ifBlank { "Could not start. Please try again." }
            }
        }
        return e.localizedMessage ?: "Could not start. Please try again."
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
