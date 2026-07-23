@file:OptIn(androidx.compose.animation.ExperimentalSharedTransitionApi::class)

package com.dreambees.android.ui

import android.content.Context

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.PhotoLibrary
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.dreambees.android.core.DreamBeesCoreState
import com.dreambees.android.core.DreamBeesEngine
import com.dreambees.android.domain.models.AspectRatio
import com.dreambees.android.domain.models.DreamBeeModel
import com.dreambees.android.domain.models.DreamTrailMode
import com.dreambees.android.domain.models.GenerationHistoryItem
import com.dreambees.android.domain.models.GenerationRequest
import com.dreambees.android.domain.models.GenerationStage
import com.dreambees.android.domain.models.UserWallet
import com.dreambees.android.domain.services.ZapCostPolicy
import com.dreambees.android.infrastructure.FirebaseDripDreamBeesRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.ListenerRegistration
import androidx.compose.runtime.DisposableEffect
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import coil.compose.AsyncImage
import androidx.compose.animation.core.*
import androidx.compose.ui.geometry.Offset
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.Crossfade
import androidx.compose.animation.togetherWith
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.AnimatedContentScope
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.offset

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private data class PendingRemix(
    val prompt: String,
    val modelId: String,
    val ratio: AspectRatio,
    val mode: DreamTrailMode
)

private val HoneyGold = Color(0xFFFBBF24)
private val NectarPurple = Color(0xFF8B5CF6)
private val DeepGarden = Color(0xFF120B21)
private val NightCard = Color(0xFF21162F)

// Deprecated template models removed


enum class AppTab(
    val label: String,
    val activeIcon: ImageVector,
    val inactiveIcon: ImageVector
) {
    Styles("Styles", Icons.Rounded.Palette, Icons.Outlined.Palette),
    Create("Create", Icons.Rounded.AutoAwesome, Icons.Outlined.AutoAwesome),
    MyArt("My Art", Icons.Rounded.PhotoLibrary, Icons.Outlined.PhotoLibrary),
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun DreamBeesAndroidApp() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val repository = remember { FirebaseDripDreamBeesRepository(context) }
    val engine = remember { DreamBeesEngine() }
    val scope = rememberCoroutineScope()
    val authViewModel: AuthViewModel = viewModel()
    var selectedTab by remember { mutableStateOf(AppTab.Styles) }

    val googleSignInClient = remember {
        val webClientIdResId = context.resources.getIdentifier("default_web_client_id", "string", context.packageName)
        val webClientId = if (webClientIdResId != 0) context.getString(webClientIdResId) else ""
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .build()
        GoogleSignIn.getClient(context, gso)
    }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        android.util.Log.e("DreamBeesAndroidApp", "ActivityResult callback: resultCode=${result.resultCode}")
        val intentData = result.data
        if (result.resultCode != android.app.Activity.RESULT_OK || intentData == null) {
            authViewModel.handleSignInFailure(ApiException(com.google.android.gms.common.api.Status(12501, "Sign-in cancelled")))
            return@rememberLauncherForActivityResult
        }
        val task = GoogleSignIn.getSignedInAccountFromIntent(intentData)
        try {
            val account = task.getResult(ApiException::class.java)
            val idToken = account.idToken
            if (idToken != null) {
                val credential = GoogleAuthProvider.getCredential(idToken, null)
                authViewModel.handleSignInSuccess(credential)
            } else {
                authViewModel.handleSignInFailure(Exception("Google Sign-In failed: ID Token was null"))
            }
        } catch (e: ApiException) {
            android.util.Log.e("DreamBeesAndroidApp", "ApiException in activity result code=${e.statusCode}", e)
            authViewModel.handleSignInFailure(e)
        } catch (e: Exception) {
            android.util.Log.e("DreamBeesAndroidApp", "Generic exception in activity result", e)
            authViewModel.handleSignInFailure(e)
        }
    }

    var state by remember { mutableStateOf(DreamBeesCoreState()) }
    var generationJob by remember { mutableStateOf<Job?>(null) }
    var pendingRemix by remember { mutableStateOf<PendingRemix?>(null) }
    BackHandler(enabled = selectedTab != AppTab.Styles && pendingRemix == null) {
        selectedTab = AppTab.Styles
    }

    DisposableEffect(authViewModel.authState) {
        var walletReg: ListenerRegistration? = null
        var historyReg: ListenerRegistration? = null

        if (authViewModel.authState is AuthState.Authenticated) {
            val currentUser = FirebaseAuth.getInstance().currentUser
            if (currentUser != null) {
                val uid = currentUser.uid
                
                // Load models on startup
                scope.launch {
                    try {
                        val models = repository.loadModels()
                        state = engine.withModels(state, models)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                walletReg = repository.observeWallet(uid) { updatedWallet ->
                    state = state.copy(wallet = updatedWallet)
                }
                historyReg = repository.observeHistory(uid) { updatedHistory ->
                    state = state.copy(history = updatedHistory)
                }
            }
        }

        onDispose {
            walletReg?.remove()
            historyReg?.remove()
        }
    }

    LaunchedEffect(state.generationStage) {
        if (state.generationStage == GenerationStage.Complete) {
            android.widget.Toast.makeText(
                context,
                "Masterpiece ready! ⚡ Check it in My Art.",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val createPulseScale by if (state.isGenerating) {
        infiniteTransition.animateFloat(
            initialValue = 1.0f,
            targetValue = 1.12f,
            animationSpec = infiniteRepeatable(
                animation = tween(1000, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "createPulseScale"
        )
    } else {
        animateFloatAsState(targetValue = if (selectedTab == AppTab.Create) 1.15f else 1.0f, label = "createScale")
    }

    val stylesScale by animateFloatAsState(targetValue = if (selectedTab == AppTab.Styles) 1.15f else 1.0f, label = "stylesScale")
    val myArtScale by animateFloatAsState(targetValue = if (selectedTab == AppTab.MyArt) 1.15f else 1.0f, label = "myArtScale")

    DreamBeesTheme {
        SharedTransitionLayout {
            AnimatedContent(
                targetState = authViewModel.authState,
                transitionSpec = {
                    if (initialState is AuthState.SplashLoading) {
                        (fadeIn(animationSpec = tween(600, easing = LinearOutSlowInEasing)) + 
                         scaleIn(initialScale = 1.06f, animationSpec = tween(600, easing = LinearOutSlowInEasing)))
                            .togetherWith(
                                fadeOut(animationSpec = tween(600, easing = FastOutLinearInEasing)) + 
                                scaleOut(targetScale = 0.90f, animationSpec = tween(600, easing = FastOutLinearInEasing))
                            )
                    } else {
                        fadeIn(animationSpec = tween(300)).togetherWith(fadeOut(animationSpec = tween(300)))
                    }
                },
                label = "appStateTransition"
            ) { navState ->
                when (navState) {
                    is AuthState.SplashLoading -> {
                        SplashScreen(
                            sharedTransitionScope = this@SharedTransitionLayout,
                            animatedContentScope = this@AnimatedContent
                        )
                    }
                    is AuthState.Offline -> {
                        OfflineScreen(onRetry = {
                            authViewModel.checkInitialSession()
                        })
                    }
                    is AuthState.Unauthenticated,
                    is AuthState.Authenticating,
                    is AuthState.Error -> {
                        AuthScreen(
                            state = navState,
                            viewModel = authViewModel,
                            sharedTransitionScope = this@SharedTransitionLayout,
                            animatedContentScope = this@AnimatedContent,
                            onSignInClick = {
                                if (!authViewModel.isGooglePlayServicesAvailable(context)) {
                                    authViewModel.handleSignInFailure(Exception("Google Play Services are unavailable on this device. Sign in requires Google Play Services."))
                                    return@AuthScreen
                                }
                                val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
                                val activeNetwork = connectivityManager.activeNetwork
                                val caps = connectivityManager.getNetworkCapabilities(activeNetwork)
                                val hasInternet = caps != null && (
                                        caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI) ||
                                        caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR) ||
                                        caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_ETHERNET)
                                )
                                if (!hasInternet) {
                                    authViewModel.handleSignInFailure(com.google.android.gms.common.api.ApiException(com.google.android.gms.common.api.Status(7, "Offline")))
                                    return@AuthScreen
                                }
                                authViewModel.startAuthenticating()
                                launcher.launch(googleSignInClient.signInIntent)
                            }
                        )
                    }
                is AuthState.Authenticated -> {
                    Scaffold(
                        containerColor = DeepGarden,
                        topBar = {
                            DreamBeesTopAppBar(
                                wallet = state.wallet,
                                isOffline = state.isOffline,
                                isGenerating = state.isGenerating,
                                progress = state.progress,
                                onProgressClick = { selectedTab = AppTab.Create }
                            )
                        },
                        bottomBar = {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(84.dp)
                                    .background(Color(0xF21A1028))
                                    .navigationBarsPadding(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                // Left Tab: Styles (AppTab.Styles)
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable(
                                            interactionSource = remember { MutableInteractionSource() },
                                            indication = null,
                                            onClick = { selectedTab = AppTab.Styles }
                                        )
                                        .scale(stylesScale),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = if (selectedTab == AppTab.Styles) Icons.Rounded.Palette else Icons.Outlined.Palette,
                                        contentDescription = "Styles",
                                        tint = if (selectedTab == AppTab.Styles) HoneyGold else Color.White.copy(alpha = 0.5f),
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Styles",
                                        color = if (selectedTab == AppTab.Styles) HoneyGold else Color.White.copy(alpha = 0.5f),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = if (selectedTab == AppTab.Styles) FontWeight.Bold else FontWeight.Normal
                                    )
                                }

                                // Center Tab: Create (Floating Action Button style)
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier
                                        .weight(1f)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .offset(y = (-10).dp)
                                            .size(56.dp)
                                            .scale(createPulseScale)
                                            .clip(CircleShape)
                                            .background(
                                                Brush.horizontalGradient(
                                                    if (selectedTab == AppTab.Create)
                                                        listOf(NectarPurple, HoneyGold)
                                                    else
                                                        listOf(NectarPurple.copy(alpha = 0.6f), HoneyGold.copy(alpha = 0.4f))
                                                )
                                            )
                                            .clickable(
                                                interactionSource = remember { MutableInteractionSource() },
                                                indication = null,
                                                onClick = { selectedTab = AppTab.Create }
                                            )
                                            .border(
                                                width = 2.dp,
                                                color = if (selectedTab == AppTab.Create) Color.White else Color.White.copy(alpha = 0.15f),
                                                shape = CircleShape
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Rounded.AutoAwesome,
                                            contentDescription = "Create",
                                            tint = if (selectedTab == AppTab.Create) Color(0xFF120B21) else Color.White,
                                            modifier = Modifier.size(28.dp)
                                        )
                                    }
                                }

                                // Right Tab: My Art (AppTab.MyArt)
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable(
                                            interactionSource = remember { MutableInteractionSource() },
                                            indication = null,
                                            onClick = { selectedTab = AppTab.MyArt }
                                        )
                                        .scale(myArtScale),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = if (selectedTab == AppTab.MyArt) Icons.Rounded.PhotoLibrary else Icons.Outlined.PhotoLibrary,
                                        contentDescription = "My Art",
                                        tint = if (selectedTab == AppTab.MyArt) HoneyGold else Color.White.copy(alpha = 0.5f),
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "My Art",
                                        color = if (selectedTab == AppTab.MyArt) HoneyGold else Color.White.copy(alpha = 0.5f),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = if (selectedTab == AppTab.MyArt) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            }
                        },
                    ) { padding ->
                        Surface(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(padding),
                            color = DeepGarden,
                        ) {
                            Crossfade(targetState = selectedTab, label = "tabTransition") { tab ->
                                when (tab) {
                                    AppTab.Styles -> StylesScreen(
                                        state = state,
                                        onSelectStyle = { model ->
                                            state = engine.selectModel(state, model)
                                            selectedTab = AppTab.Create
                                            android.widget.Toast.makeText(
                                                context,
                                                "Selected Style: ${model.name} 🎨",
                                                android.widget.Toast.LENGTH_SHORT
                                            ).show()
                                        }
                                    )

                                    AppTab.Create -> GeneratorScreen(
                                        state = state,
                                        blockReason = engine.blockReason(state),
                                        onPromptChange = { state = engine.updatePrompt(state, it) },
                                        onModeChange = { state = engine.updateMode(state, it) },
                                        onAspectChange = { state = engine.updateAspectRatio(state, it) },
                                        onSelectStyle = { state = engine.selectModel(state, it) },
                                        onCreate = {
                                            val model = state.selectedModel ?: return@GeneratorScreen
                                            if (!engine.canCreate(state)) return@GeneratorScreen
                                            val request = GenerationRequest(state.prompt, model, state.aspectRatio, state.mode)
                                            generationJob = scope.launch {
                                                try {
                                                    state = state.copy(isGenerating = true, generationStage = GenerationStage.Submitting, progress = 10)
                                                    val item = repository.createGenerationWithProgress(request) { stage, progress, _ ->
                                                        state = engine.generationProgress(state, stage, progress)
                                                    }
                                                    state = engine.completeGeneration(state, item)
                                                } catch (e: CancellationException) {
                                                    state = state.copy(
                                                        isGenerating = false,
                                                        generationStage = GenerationStage.Idle,
                                                        progress = 0
                                                    )
                                                } catch (e: Exception) {
                                                    e.printStackTrace()
                                                    state = state.copy(
                                                        isGenerating = false,
                                                        generationStage = GenerationStage.Idle,
                                                        progress = 0
                                                    )
                                                    android.widget.Toast.makeText(
                                                        context,
                                                        "Error: ${e.localizedMessage ?: "Generation failed"}",
                                                        android.widget.Toast.LENGTH_LONG
                                                    ).show()
                                                } finally {
                                                    generationJob = null
                                                }
                                            }
                                        },
                                        onCancel = {
                                            generationJob?.cancel()
                                        }
                                    )

                                    AppTab.MyArt -> ProfileScreen(
                                        state = state,
                                        repository = repository,
                                        onNavigateToCreate = { selectedTab = AppTab.Create },
                                        onRemix = { prompt, modelName, ratio, mode ->
                                            if (state.prompt.isNotBlank() && state.prompt != prompt) {
                                                pendingRemix = PendingRemix(prompt, modelName, ratio, mode)
                                            } else {
                                                val model = state.models.find { it.name == modelName } ?: state.selectedModel
                                                state = state.copy(
                                                    prompt = prompt,
                                                    selectedModel = model,
                                                    aspectRatio = ratio,
                                                    mode = mode
                                                )
                                                selectedTab = AppTab.Create
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Remix blueprint loaded! ⚡",
                                                    android.widget.Toast.LENGTH_SHORT
                                                ).show()
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }

                    pendingRemix?.let { remix ->
                        AlertDialog(
                            onDismissRequest = { pendingRemix = null },
                            title = {
                                Text(
                                    text = "Discard current draft?",
                                    style = MaterialTheme.typography.titleLarge,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            },
                            text = {
                                Text(
                                    text = "You are currently editing a prompt in the Studio. Remixing this item will overwrite your current draft.",
                                    color = Color.White.copy(alpha = 0.8f),
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            },
                            confirmButton = {
                                Button(
                                    onClick = {
                                        val model = state.models.find { it.id == remix.modelId || it.name == remix.modelId } ?: state.selectedModel
                                        state = state.copy(
                                            prompt = remix.prompt,
                                            selectedModel = model,
                                            aspectRatio = remix.ratio,
                                            mode = remix.mode
                                        )
                                        selectedTab = AppTab.Create
                                        pendingRemix = null
                                        android.widget.Toast.makeText(
                                            context,
                                            "Blueprint loaded! ⚡",
                                            android.widget.Toast.LENGTH_SHORT
                                        ).show()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = HoneyGold, contentColor = Color(0xFF2D1B00)),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Overwrite ⚡", fontWeight = FontWeight.Bold)
                                }
                            },
                            dismissButton = {
                                Button(
                                    onClick = { pendingRemix = null },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.08f), contentColor = Color.White),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Keep Draft")
                                }
                            },
                            containerColor = NightCard,
                            textContentColor = Color.White,
                            titleContentColor = Color.White,
                            shape = RoundedCornerShape(24.dp)
                        )
                    }
                }
            }
        }
    }
}
}

@Composable
private fun DreamBeesTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = NectarPurple,
            secondary = HoneyGold,
            surface = NightCard,
            background = DeepGarden,
        ),
        content = content,
    )
}

@Composable
private fun DreamBeesTopAppBar(
    wallet: UserWallet,
    isOffline: Boolean,
    isGenerating: Boolean,
    progress: Int,
    onProgressClick: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xF2120B21),
        shadowElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Brush.linearGradient(listOf(HoneyGold, NectarPurple))),
                    contentAlignment = Alignment.Center
                ) {
                    Text("🐝", style = MaterialTheme.typography.titleMedium)
                }
                Spacer(Modifier.width(10.dp))
                Text(
                    text = "DreamBees AI",
                    style = MaterialTheme.typography.titleLarge.copy(
                        brush = Brush.linearGradient(
                            colors = listOf(Color.White, HoneyGold)
                        ),
                        fontWeight = FontWeight.Black
                    )
                )
            }

            Spacer(Modifier.weight(1f))

            if (isGenerating) {
                Box(
                    modifier = Modifier
                        .padding(end = 10.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(NectarPurple.copy(alpha = 0.25f))
                        .border(1.dp, NectarPurple.copy(alpha = 0.8f), RoundedCornerShape(16.dp))
                        .clickable(onClick = onProgressClick)
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(HoneyGold)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = "🎨 Painting $progress%",
                            color = Color.White,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            if (isOffline) {
                Box(
                    modifier = Modifier
                        .padding(end = 10.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.Red.copy(alpha = 0.2f))
                        .border(1.dp, Color.Red, RoundedCornerShape(12.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("Offline", color = Color.Red, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                }
            }

            // Zap badge — shows count and refill countdown for non-technical users
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White.copy(alpha = 0.08f))
                    .border(
                        1.dp,
                        if (wallet.zaps != null && wallet.zaps!! < 1.0) Color(0xFFFF5959).copy(alpha = 0.6f)
                        else HoneyGold.copy(alpha = 0.3f),
                        RoundedCornerShape(16.dp)
                    )
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("⚡", color = HoneyGold, style = MaterialTheme.typography.labelLarge)
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = wallet.displayText().replace(" Zaps", "").replace("Unlimited", "∞"),
                            color = Color.White,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    // Show refill countdown when not full — key UX for non-technical users
                    val next = wallet.nextDripSeconds ?: 0
                    if (next > 0) {
                        val mins = next / 60
                        val secs = next % 60
                        val countdownText = if (mins > 0) "+1 in ${mins}m ${secs}s" else "+1 in ${secs}s"
                        Text(
                            text = countdownText,
                            color = HoneyGold.copy(alpha = 0.7f),
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StyleDetailBottomSheet(
    model: DreamBeeModel,
    onDismiss: () -> Unit,
    onSelect: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = NightCard,
        contentColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Brush.radialGradient(listOf(HoneyGold, NectarPurple, Color(0xFF31214A)))),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = model.imageUrl,
                    contentDescription = model.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    error = androidx.compose.ui.graphics.painter.ColorPainter(Color.Transparent)
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f))
                            )
                        )
                )
                Text(
                    text = "🐝",
                    style = MaterialTheme.typography.displayMedium,
                    modifier = Modifier.align(Alignment.Center)
                )
            }

            Spacer(Modifier.height(18.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = model.name,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black
                )
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(HoneyGold.copy(alpha = 0.15f))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = if (model.isFree) "Free" else "${ZapCostPolicy.costFor(model.id, "free")} Zaps",
                        color = HoneyGold,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            val recommendation = when (model.id) {
                "anima", "hassaku" -> "Great for Cute Anime"
                "z-image-turbo-a100" -> "Fastest Generation"
                "wai-illustrious" -> "Ultra High Definition"
                "nova-3d-cg-xl" -> "Beautiful 3D Lighting"
                else -> "All-Rounder Preset"
            }
            Box(
                modifier = Modifier
                    .align(Alignment.Start)
                    .clip(RoundedCornerShape(8.dp))
                    .background(NectarPurple.copy(alpha = 0.2f))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = recommendation,
                    color = Color(0xFFC084FC),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(Modifier.height(16.dp))

            Text(
                text = model.description,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.8f),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = {
                    onSelect()
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = HoneyGold,
                    contentColor = Color(0xFF2D1B00)
                ),
                shape = RoundedCornerShape(18.dp)
            ) {
                Text(
                    text = "Select & Generate ⚡",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Black
                )
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}


@Composable
private fun StylesScreen(
    state: DreamBeesCoreState,
    onSelectStyle: (DreamBeeModel) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            HeroHeader(
                eyebrow = "Visual Direction",
                title = "Choose a Style",
                body = "Select a preset style to begin creating your masterpiece."
            )
        }

        if (state.models.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    LinearProgressIndicator(color = HoneyGold)
                }
            }
        } else {
            val chunks = state.models.chunked(2)
            chunks.forEach { rowItems ->
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        rowItems.forEach { model ->
                            Box(modifier = Modifier.weight(1f)) {
                                StyleGridCard(
                                    model = model,
                                    isSelected = state.selectedModel?.id == model.id,
                                    onClick = { onSelectStyle(model) }
                                )
                            }
                        }
                        if (rowItems.size < 2) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StyleGridCard(
    model: DreamBeeModel,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .border(
                width = if (isSelected) 2.dp else 1.dp,
                color = if (isSelected) HoneyGold else Color.White.copy(alpha = 0.10f),
                shape = RoundedCornerShape(24.dp)
            ),
        colors = CardDefaults.cardColors(containerColor = NightCard.copy(alpha = 0.94f)),
        shape = RoundedCornerShape(24.dp),
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(Color.White.copy(alpha = 0.05f))
            ) {
                AsyncImage(
                    model = model.imageUrl,
                    contentDescription = model.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    error = androidx.compose.ui.graphics.painter.ColorPainter(Color.Transparent)
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f))
                            )
                        )
                )
                
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.65f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = if (model.isFree) "Free" else "${ZapCostPolicy.costFor(model.id, "free")} Zaps",
                        style = MaterialTheme.typography.labelSmall,
                        color = HoneyGold,
                        fontWeight = FontWeight.Bold
                    )
                }

                if (isSelected) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(NectarPurple.copy(alpha = 0.3f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(HoneyGold)
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "Active Style 🐝",
                                style = MaterialTheme.typography.labelMedium,
                                color = Color(0xFF120B21),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
            
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp)
            ) {
                Text(
                    text = model.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = model.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.65f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun GeneratorScreen(
    state: DreamBeesCoreState,
    blockReason: String?,
    onPromptChange: (String) -> Unit,
    onModeChange: (DreamTrailMode) -> Unit,
    onAspectChange: (AspectRatio) -> Unit,
    onSelectStyle: (DreamBeeModel) -> Unit,
    onCreate: () -> Unit,
    onCancel: () -> Unit
) {
    var showStylePickerSheet by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        item {
            HeroHeader(
                eyebrow = state.wallet.displayText(),
                title = "Create a picture",
                body = "Write an idea, pick a shape, tap create.",
            )
        }
        item {
            CardPanel {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("What do you want?", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        text = "🎲 Inspire Me",
                        color = HoneyGold,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.clickable {
                            val starterPrompts = listOf(
                                "A cybernetic honeybee with glowing neon wings in a futuristic hive",
                                "Cozy cottage inside a glass jar, filled with tiny glowing fireflies",
                                "A magical forest of giant mushrooms and glowing blue pathways",
                                "A playful baby panda floating on a cotton candy cloud, pastel colors",
                                "Watercolor painting of a secret castle hidden behind a waterfall",
                                "Cute little robot tasting a honey drop, retro pixel art style",
                                "Astronaut bee playing a tiny harp on top of the moon",
                                "Dreamy fantasy library where books are flying like birds"
                            )
                            onPromptChange(starterPrompts.random())
                        }
                    )
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = state.prompt,
                    onValueChange = onPromptChange,
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 4,
                    maxLines = 6,
                    placeholder = { Text("A friendly bee painting a rainbow…") },
                    trailingIcon = {
                        if (state.prompt.isNotEmpty()) {
                            Icon(
                                imageVector = Icons.Rounded.Close,
                                contentDescription = "Clear Prompt",
                                tint = Color.White.copy(alpha = 0.5f),
                                modifier = Modifier.clickable { onPromptChange("") }
                            )
                        }
                    }
                )
                Spacer(Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    Text(
                        text = "${state.prompt.length} / 1000",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.4f)
                    )
                }
                Spacer(Modifier.height(10.dp))
                val suggestionChips = listOf("3D Render", "Cute Sticker", "Retro Pixel Art", "Vibrant Watercolor")
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(suggestionChips) { tag ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color.White.copy(alpha = 0.06f))
                                .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                                .clickable {
                                    val current = state.prompt
                                    val addition = if (current.trim().endsWith(",")) " $tag" else if (current.isNotBlank()) ", $tag" else tag
                                    onPromptChange(current + addition)
                                }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "+ $tag",
                                color = Color.White.copy(alpha = 0.8f),
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(DreamTrailMode.entries) { mode ->
                        FilterChip(
                            selected = state.mode == mode,
                            onClick = { onModeChange(mode) },
                            label = { Text(mode.label) },
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    text = state.mode.helperText,
                    color = Color.White.copy(alpha = 0.62f),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
        item {
            CardPanel {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Text("Shape", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.weight(1f))
                    Text(state.aspectRatio.value, color = HoneyGold, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(AspectRatio.entries) { ratio ->
                        RatioChip(ratio, selected = ratio == state.aspectRatio, onClick = { onAspectChange(ratio) })
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text(
                    text = state.aspectRatio.description,
                    color = Color.White.copy(alpha = 0.62f),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        // Quick Styles Carousel
        item {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Visual Style", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        text = "See All Styles ➔",
                        color = HoneyGold,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.clickable { showStylePickerSheet = true }
                    )
                }
                Spacer(Modifier.height(8.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(state.models.take(4)) { model ->
                        val isSelected = state.selectedModel?.id == model.id
                        Column(
                            modifier = Modifier
                                .width(90.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (isSelected) NectarPurple.copy(alpha = 0.35f) else Color.White.copy(alpha = 0.05f))
                                .border(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) HoneyGold else Color.White.copy(alpha = 0.08f),
                                    shape = RoundedCornerShape(16.dp)
                                )
                                .clickable { onSelectStyle(model) }
                                .padding(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(60.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color.White.copy(alpha = 0.05f))
                            ) {
                                AsyncImage(
                                    model = model.imageUrl,
                                    contentDescription = model.name,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                    error = androidx.compose.ui.graphics.painter.ColorPainter(Color.Transparent)
                                )
                                if (isSelected) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .background(Color.Black.copy(alpha = 0.4f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("🐝", style = MaterialTheme.typography.bodyMedium)
                                    }
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(
                                text = model.name,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) HoneyGold else Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                    item {
                        Column(
                            modifier = Modifier
                                .width(90.dp)
                                .height(106.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(Color.White.copy(alpha = 0.05f))
                                .border(1.5.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(16.dp))
                                .clickable { showStylePickerSheet = true }
                                .padding(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Text("✨", style = MaterialTheme.typography.headlineSmall)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = "More",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = HoneyGold
                            )
                        }
                    }
                }
            }
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = NightCard.copy(alpha = 0.95f)),
                shape = RoundedCornerShape(28.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = { showStylePickerSheet = true })
                    .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(28.dp))
            ) {
                Row(
                    Modifier
                        .padding(18.dp)
                        .fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Brush.linearGradient(listOf(HoneyGold, NectarPurple))),
                        contentAlignment = Alignment.Center
                    ) {
                        state.selectedModel?.let { model ->
                            AsyncImage(
                                model = model.imageUrl,
                                contentDescription = model.name,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                error = androidx.compose.ui.graphics.painter.ColorPainter(Color.Transparent)
                            )
                        } ?: Text("🐝")
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Active Style", color = Color.White.copy(alpha = 0.68f), style = MaterialTheme.typography.labelMedium)
                        Text(state.selectedModel?.name ?: "Choose a Visual Direction", fontWeight = FontWeight.Black)
                    }
                    Icon(
                        imageVector = Icons.Rounded.ChevronRight,
                        contentDescription = "Change Style",
                        tint = HoneyGold
                    )
                }
            }
        }
        item {
            Button(
                onClick = onCreate,
                enabled = blockReason == null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(58.dp),
                colors = ButtonDefaults.buttonColors(containerColor = HoneyGold, contentColor = Color(0xFF2D1B00)),
                shape = RoundedCornerShape(22.dp),
            ) {
                Text(if (state.isGenerating) state.generationStage.label else "⚡ Create picture", fontWeight = FontWeight.Black)
            }
            blockReason?.let { reason ->
                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0x1FFF5959))
                        .border(1.dp, Color(0xFFFF5959).copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("⚠️", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = reason,
                        color = Color(0xFFFF8585),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
        item {
            PreviewPanel(state, onCancel = onCancel)
        }
    }

    if (showStylePickerSheet) {
        StylePickerBottomSheet(
            models = state.models,
            selectedModel = state.selectedModel,
            onDismiss = { showStylePickerSheet = false },
            onSelect = onSelectStyle
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StylePickerBottomSheet(
    models: List<DreamBeeModel>,
    selectedModel: DreamBeeModel?,
    onDismiss: () -> Unit,
    onSelect: (DreamBeeModel) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("All") }
    val categories = listOf("All", "Anime", "Realistic", "3D", "Fast")

    val filteredModels = models.filter { model ->
        val matchesSearch = model.name.contains(searchQuery, ignoreCase = true) ||
                model.description.contains(searchQuery, ignoreCase = true)
        val matchesCategory = when (category) {
            "Anime" -> model.description.contains("anime", ignoreCase = true) || model.id in setOf("anima", "hassaku", "kiwimix")
            "Realistic" -> model.description.contains("photo", ignoreCase = true) || model.id in setOf("wai-illustrious")
            "3D" -> model.description.contains("3d", ignoreCase = true) || model.id in setOf("nova-3d-cg-xl")
            "Fast" -> model.id == "z-image-turbo-a100"
            else -> true
        }
        matchesSearch && matchesCategory
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = NightCard,
        contentColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 10.dp)
        ) {
            Text(
                text = "Choose a Visual Style",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search styles...") },
                singleLine = true,
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Rounded.Search,
                        contentDescription = "Search",
                        tint = Color.White.copy(alpha = 0.5f)
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Clear",
                            tint = Color.White.copy(alpha = 0.5f),
                            modifier = Modifier.clickable { searchQuery = "" }
                        )
                    }
                },
                shape = RoundedCornerShape(16.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                items(categories) { cat ->
                    FilterChip(
                        selected = category == cat,
                        onClick = { category = cat },
                        label = { Text(cat) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(350.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (filteredModels.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text("No styles found", color = Color.White.copy(alpha = 0.6f))
                        }
                    }
                } else {
                    items(filteredModels) { model ->
                        StyleCard(
                            model = model,
                            selected = selectedModel?.id == model.id,
                            onClick = {
                                onSelect(model)
                                onDismiss()
                            }
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun ProfileScreen(
    state: DreamBeesCoreState,
    repository: FirebaseDripDreamBeesRepository,
    onNavigateToCreate: () -> Unit,
    onRemix: (prompt: String, modelName: String, ratio: AspectRatio, mode: DreamTrailMode) -> Unit
) {
    var selectedItemForDetails by remember { mutableStateOf<GenerationHistoryItem?>(null) }
    val scope = rememberCoroutineScope()

    // Derive a human-friendly display name from current auth state.
    val currentFirebaseUser = FirebaseAuth.getInstance().currentUser
    val displayName = currentFirebaseUser?.email?.substringBefore('@') ?: "Creator"
    val accountSubtitle = "Signed in · Drip Ticker Active ⚡"

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            HeroHeader(
                eyebrow = "Your DreamBees",
                title = "My Garden",
                body = "Everything you've created lives here."
            )
        }
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(Brush.linearGradient(listOf(NightCard, Color(0xFF1D1030))))
                    .border(1.dp, HoneyGold.copy(alpha = 0.2f), RoundedCornerShape(24.dp))
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(CircleShape)
                        .background(Brush.linearGradient(listOf(HoneyGold, NectarPurple))),
                    contentAlignment = Alignment.Center
                ) {
                    Text("🐝", style = MaterialTheme.typography.titleLarge)
                }
                Spacer(Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(displayName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black)
                    Spacer(Modifier.height(4.dp))
                    Text(accountSubtitle, color = Color.White.copy(alpha = 0.6f), style = MaterialTheme.typography.bodySmall)
                }

                Button(
                    onClick = {
                        scope.launch {
                            repository.logout()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.08f), contentColor = Color.White),
                    modifier = Modifier.border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(12.dp)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Sign Out 🚪", fontWeight = FontWeight.Bold)
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                val zapsDisplay = if (state.wallet.hasUnlimitedCredits) "∞" else "${state.wallet.zaps?.toInt() ?: 0}"
                val tierDisplay = state.wallet.tier.replaceFirstChar { it.uppercase() }
                listOf(
                    "Credits" to "$zapsDisplay ⚡",
                    "Gallery" to "${state.history.size} items 🖼️",
                    "Status" to tierDisplay
                ).forEach { (title, value) ->
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(16.dp))
                            .background(NightCard)
                            .border(1.dp, Color.White.copy(alpha = 0.06f), RoundedCornerShape(16.dp))
                            .padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(title, color = Color.White.copy(alpha = 0.5f), style = MaterialTheme.typography.labelMedium)
                        Spacer(Modifier.height(4.dp))
                        Text(value, fontWeight = FontWeight.Bold, color = Color.White, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        item {
            Text("Recent Creations", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
        }

        if (state.history.isEmpty()) {
            item {
                EmptyHistory(onNavigateToCreate)
            }
        } else {
            // Render 2-column personal gallery grid using chunks of 2
            val historyChunks = state.history.chunked(2)
            historyChunks.forEach { rowItems ->
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        rowItems.forEach { item ->
                            Box(modifier = Modifier.weight(1f)) {
                                GalleryGridCard(item, onClick = { selectedItemForDetails = item })
                            }
                        }
                        if (rowItems.size < 2) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }

    selectedItemForDetails?.let { item ->
        GalleryDetailBottomSheet(
            item = item,
            onDismiss = { selectedItemForDetails = null },
            onRemix = {
                onRemix(item.prompt, item.modelName, item.aspectRatio, item.mode)
            }
        )
    }
}

@Composable
private fun GalleryGridCard(item: GenerationHistoryItem, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(20.dp)),
        colors = CardDefaults.cardColors(containerColor = NightCard.copy(alpha = 0.9f)),
        shape = RoundedCornerShape(20.dp),
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .background(Color.White.copy(alpha = 0.05f))
            ) {
                AsyncImage(
                    model = item.imageUrl,
                    contentDescription = item.prompt,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    error = androidx.compose.ui.graphics.painter.ColorPainter(Color.Transparent)
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f))
                            )
                        )
                )
                Text(
                    text = item.modelName,
                    style = MaterialTheme.typography.labelSmall,
                    color = HoneyGold,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(8.dp)
                )
                // Aspect Ratio overlay tag
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.65f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = item.aspectRatio.value,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.8f),
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Text(
                text = item.prompt,
                style = MaterialTheme.typography.bodySmall,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(10.dp)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GalleryDetailBottomSheet(
    item: GenerationHistoryItem,
    onDismiss: () -> Unit,
    onRemix: () -> Unit
) {
    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
    val context = androidx.compose.ui.platform.LocalContext.current

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = NightCard,
        contentColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Brush.radialGradient(listOf(HoneyGold, NectarPurple, Color(0xFF31214A)))),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = item.imageUrl,
                    contentDescription = item.prompt,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
            }

            Spacer(Modifier.height(18.dp))

            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Prompt",
                    color = HoneyGold,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.labelLarge
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = item.prompt,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(Modifier.height(14.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White.copy(alpha = 0.04f))
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Style", color = Color.White.copy(alpha = 0.6f), style = MaterialTheme.typography.labelMedium)
                    Text(item.modelName, fontWeight = FontWeight.Bold, color = Color.White)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Shape", color = Color.White.copy(alpha = 0.6f), style = MaterialTheme.typography.labelMedium)
                    Text(item.aspectRatio.label, fontWeight = FontWeight.Bold, color = Color.White)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Mode", color = Color.White.copy(alpha = 0.6f), style = MaterialTheme.typography.labelMedium)
                    Text(item.mode.label, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }

            Spacer(Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = {
                        clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(item.prompt))
                        android.widget.Toast.makeText(context, "Prompt copied to clipboard!", android.widget.Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White.copy(alpha = 0.1f),
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(18.dp)
                ) {
                    Text("Copy Prompt", fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = {
                        val shareIntent = android.content.Intent().apply {
                            action = android.content.Intent.ACTION_SEND
                            putExtra(android.content.Intent.EXTRA_TEXT, "Check out my DreamBees artwork!\nPrompt: ${item.prompt}")
                            type = "text/plain"
                        }
                        context.startActivity(android.content.Intent.createChooser(shareIntent, "Share artwork prompt"))
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White.copy(alpha = 0.1f),
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(18.dp)
                ) {
                    Text("Share 📤", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(12.dp))

            Button(
                onClick = {
                    onRemix()
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = HoneyGold,
                    contentColor = Color(0xFF2D1B00)
                ),
                shape = RoundedCornerShape(18.dp)
            ) {
                Text("Remix & Create ⚡", fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.height(12.dp))
        }
    }
}

@Composable
private fun HeroHeader(eyebrow: String, title: String, body: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(30.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF2B1746), Color(0xFF42215E), Color(0xFF1A1028))))
            .padding(22.dp),
    ) {
        Text(eyebrow, color = HoneyGold, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(title, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(6.dp))
        Text(body, color = Color.White.copy(alpha = 0.74f))
    }
}

@Composable
private fun StyleCard(model: DreamBeeModel, selected: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .border(
                width = if (selected) 2.dp else 1.dp,
                color = if (selected) HoneyGold else Color.White.copy(alpha = 0.10f),
                shape = RoundedCornerShape(28.dp),
            ),
        colors = CardDefaults.cardColors(containerColor = NightCard.copy(alpha = 0.94f)),
        shape = RoundedCornerShape(28.dp),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(86.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Brush.radialGradient(listOf(HoneyGold, NectarPurple, Color(0xFF31214A)))),
                contentAlignment = Alignment.Center,
            ) {
                AsyncImage(
                    model = model.imageUrl,
                    contentDescription = model.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    error = androidx.compose.ui.graphics.painter.ColorPainter(Color.Transparent)
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.4f))
                            )
                        )
                )
                Text("🐝", style = MaterialTheme.typography.titleLarge)
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(model.name, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (selected) {
                        Spacer(Modifier.width(8.dp))
                        Text("Selected", color = HoneyGold, style = MaterialTheme.typography.labelSmall)
                    }
                }
                Spacer(Modifier.height(6.dp))
                Text(model.description, color = Color.White.copy(alpha = 0.70f), maxLines = 3, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(if (model.isFree) "Free" else "${ZapCostPolicy.costFor(model.id, "free")} Zaps", color = HoneyGold, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.width(8.dp))
                    val tag = when (model.id) {
                        "anima" -> "Starter ✨"
                        "z-image-turbo-a100" -> "Fastest ⚡"
                        "wai-illustrious" -> "Trending 🔥"
                        "nova-3d-cg-xl" -> "Popular 🌟"
                        "hassaku" -> "Classic 🌸"
                        "kiwimix" -> "Vibrant 🎨"
                        "scyrax-pastel" -> "Dreamy ☁️"
                        "veretoon-v10" -> "Comic 🎭"
                        else -> null
                    }
                    tag?.let {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(NectarPurple.copy(alpha = 0.2f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(it, color = Color(0xFFC084FC), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RatioChip(ratio: AspectRatio, selected: Boolean, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(130.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(if (selected) NectarPurple.copy(alpha = 0.35f) else Color.White.copy(alpha = 0.06f))
            .border(1.dp, if (selected) HoneyGold else Color.White.copy(alpha = 0.08f), RoundedCornerShape(22.dp))
            .clickable(onClick = onClick)
            .padding(14.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp),
            contentAlignment = Alignment.Center
        ) {
            val (width, height) = when (ratio) {
                AspectRatio.Square -> 46.dp to 46.dp
                AspectRatio.Portrait -> 34.dp to 48.dp
                AspectRatio.Landscape -> 48.dp to 36.dp
                AspectRatio.Wide -> 50.dp to 28.dp
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(width = width, height = height)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Brush.linearGradient(listOf(HoneyGold, NectarPurple)))
                        .border(1.dp, Color.White.copy(alpha = 0.4f), RoundedCornerShape(6.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    when (ratio) {
                        AspectRatio.Portrait -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(4.dp)
                            ) {
                                // Notch/camera
                                Box(
                                    modifier = Modifier
                                        .size(3.dp)
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.8f))
                                        .align(Alignment.TopCenter)
                                )
                                // Home indicator bar
                                Box(
                                    modifier = Modifier
                                        .width(10.dp)
                                        .height(1.5.dp)
                                        .clip(RoundedCornerShape(1.dp))
                                        .background(Color.White.copy(alpha = 0.8f))
                                        .align(Alignment.BottomCenter)
                                )
                            }
                        }
                        AspectRatio.Square -> {
                            Box(
                                modifier = Modifier
                                    .size(20.dp)
                                    .clip(CircleShape)
                                    .border(1.5.dp, Color.White.copy(alpha = 0.7f), CircleShape)
                            )
                        }
                        else -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.7f))
                                        .align(Alignment.TopStart)
                                )
                            }
                        }
                    }
                }
                if (ratio == AspectRatio.Landscape || ratio == AspectRatio.Wide) {
                    Box(
                        modifier = Modifier
                            .width(8.dp)
                            .height(4.dp)
                            .background(Color.White.copy(alpha = 0.5f))
                    )
                    Box(
                        modifier = Modifier
                            .width(16.dp)
                            .height(2.dp)
                            .background(Color.White.copy(alpha = 0.5f))
                    )
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Text(ratio.label, fontWeight = FontWeight.Bold, color = Color.White)
        Text(ratio.value, color = Color.White.copy(alpha = 0.62f))
    }
}

@Composable
private fun PreviewPanel(state: DreamBeesCoreState, onCancel: () -> Unit) {
    val shimmerBrush = if (state.isGenerating) {
        val transition = rememberInfiniteTransition(label = "shimmer")
        val translateAnim by transition.animateFloat(
            initialValue = 0f,
            targetValue = 1000f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 1200, easing = LinearEasing),
                repeatMode = RepeatMode.Restart
            ),
            label = "shimmerTranslate"
        )
        Brush.linearGradient(
            colors = listOf(
                Color(0xFF2E1A47),
                Color(0xFF5A2A7A),
                Color(0xFF2E1A47),
            ),
            start = Offset(translateAnim - 300f, translateAnim - 300f),
            end = Offset(translateAnim + 300f, translateAnim + 300f)
        )
    } else {
        Brush.linearGradient(listOf(Color(0xFF3B1E5A), Color(0xFF111827), Color(0xFF6D3B09)))
    }

    CardPanel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                when {
                    state.isGenerating -> "Creating…"
                    state.history.isNotEmpty() -> "Newest"
                    else -> "Preview"
                },
                fontWeight = FontWeight.Black,
            )
            Spacer(Modifier.weight(1f))
            Text(state.aspectRatio.value, color = Color.White.copy(alpha = 0.62f))
        }
        Spacer(Modifier.height(12.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(shimmerBrush),
            contentAlignment = Alignment.Center,
        ) {
            val newestItem = state.history.firstOrNull()
            if (newestItem != null && !state.isGenerating) {
                AsyncImage(
                    model = newestItem.imageUrl,
                    contentDescription = newestItem.prompt,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))
                            )
                        )
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(16.dp)
                ) {
                    Text(
                        text = newestItem.prompt,
                        color = Color.White,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "Generated with ${newestItem.modelName}",
                        color = HoneyGold,
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(if (state.isGenerating) "🍯" else "🐝", style = MaterialTheme.typography.displayMedium)
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = if (state.isGenerating) "Stirring the nectar..." else "Your picture shows here",
                        modifier = Modifier.padding(horizontal = 20.dp),
                        color = Color.White.copy(alpha = 0.8f),
                    )
                }
            }
        }
        AnimatedVisibility(state.isGenerating) {
            Column {
                Spacer(Modifier.height(14.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(state.generationStage.label, color = HoneyGold, fontWeight = FontWeight.Bold)
                    Text(
                        text = "Cancel",
                        color = Color.White.copy(alpha = 0.5f),
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.clickable { onCancel() }
                    )
                }
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { state.progress / 100f },
                    modifier = Modifier.fillMaxWidth(),
                    color = HoneyGold,
                    trackColor = Color.White.copy(alpha = 0.12f),
                )
            }
        }
    }
}

@Composable
private fun CardPanel(content: @Composable ColumnScope.() -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = NightCard.copy(alpha = 0.95f)),
        shape = RoundedCornerShape(28.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(18.dp), content = content)
    }
}

@Composable
private fun HistoryCard(item: GenerationHistoryItem) {
    CardPanel {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(58.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Brush.linearGradient(listOf(HoneyGold, NectarPurple))),
                contentAlignment = Alignment.Center,
            ) {
                AsyncImage(
                    model = item.imageUrl,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(item.prompt, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text("${item.modelName} · ${item.aspectRatio.value} · ${item.createdAtLabel}", color = Color.White.copy(alpha = 0.62f))
            }
        }
    }
}

@Composable
private fun EmptyHistory(onNavigate: () -> Unit) {
    CardPanel {
        Text("No pictures yet", fontWeight = FontWeight.Black)
        Spacer(Modifier.height(6.dp))
        Text(
            "Tap \"Create\" below to make your first DreamBees picture.",
            color = Color.White.copy(alpha = 0.70f)
        )
        Spacer(Modifier.height(14.dp))
        Button(
            onClick = onNavigate,
            colors = ButtonDefaults.buttonColors(containerColor = NectarPurple),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text("Create Art ⚡", fontWeight = FontWeight.Bold)
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun DreamBeesAndroidAppPreview() {
    DreamBeesAndroidApp()
}

private enum class AppState {
    Splash,
    Auth,
    Main
}

private data class HoneycombParticle(
    val xPercent: Float,
    val yPercent: Float,
    val size: Float,
    val speed: Float,
    val angle: Float,
    val baseAlpha: Float,
    val color: Color
)

@Composable
private fun HoneycombBackground() {
    val infiniteTransition = rememberInfiniteTransition(label = "honeycomb")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.05f,
        targetValue = 0.16f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    val time by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(60000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "particleTime"
    )

    val particles = remember {
        List(25) {
            val isGold = Math.random() > 0.4
            HoneycombParticle(
                xPercent = (Math.random()).toFloat(),
                yPercent = (Math.random()).toFloat(),
                size = (4f + Math.random() * 8f).toFloat(),
                speed = (0.01f + Math.random() * 0.02f).toFloat(),
                angle = (Math.random() * Math.PI * 2).toFloat(),
                baseAlpha = (0.2f + Math.random() * 0.4f).toFloat(),
                color = if (isGold) HoneyGold else NectarPurple
            )
        }
    }

    Canvas(modifier = Modifier.fillMaxSize()) {
        val hexSize = 52f
        val w = hexSize * 1.732f
        val h = hexSize * 2f
        val cols = (size.width / w).toInt() + 2
        val rows = (size.height / (h * 0.75f)).toInt() + 2
        val path = Path()

        // Draw honeycomb background grid
        for (row in 0 until rows) {
            val yOffset = row * h * 0.75f
            val xOffsetShift = if (row % 2 == 1) w / 2f else 0f
            for (col in 0 until cols) {
                val xOffset = col * w + xOffsetShift
                val randomOffset = (row * col) % 3
                val alpha = (pulseAlpha + (randomOffset * 0.02f)).coerceIn(0.01f, 0.22f)
                
                path.reset()
                for (i in 0..5) {
                    val angleRad = i * Math.PI / 3
                    val px = xOffset + hexSize * Math.cos(angleRad).toFloat()
                    val py = yOffset + hexSize * Math.sin(angleRad).toFloat()
                    if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
                }
                path.close()
                
                drawPath(
                    path = path,
                    color = HoneyGold,
                    alpha = alpha,
                    style = Stroke(width = 1.dp.toPx())
                )
            }
        }

        // Draw glowing floating particles
        particles.forEach { particle ->
            val dx = Math.cos(particle.angle.toDouble()).toFloat() * time * particle.speed * 150f
            val dy = Math.sin(particle.angle.toDouble()).toFloat() * time * particle.speed * 150f
            
            var x = (particle.xPercent * size.width + dx) % size.width
            var y = (particle.yPercent * size.height + dy) % size.height
            if (x < 0) x += size.width
            if (y < 0) y += size.height
            
            val pulse = 0.8f + 0.2f * Math.sin((time * particle.speed * 10f).toDouble()).toFloat()
            val alpha = (particle.baseAlpha * pulse).coerceIn(0f, 1f)
            
            // Radial Glow Outer
            drawCircle(
                color = particle.color,
                radius = particle.size * 3.5f,
                center = Offset(x, y),
                alpha = alpha * 0.25f
            )
            // Radial Glow Inner
            drawCircle(
                color = particle.color,
                radius = particle.size * 1.8f,
                center = Offset(x, y),
                alpha = alpha * 0.6f
            )
            // Core
            drawCircle(
                color = Color.White,
                radius = particle.size * 0.7f,
                center = Offset(x, y),
                alpha = alpha * 0.9f
            )
        }
    }
}

@Composable
private fun SplashScreen(
    sharedTransitionScope: SharedTransitionScope,
    animatedContentScope: AnimatedContentScope
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulseLogo")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.94f,
        targetValue = 1.06f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logoScale"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepGarden),
        contentAlignment = Alignment.Center
    ) {
        HoneycombBackground()
        
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            with(sharedTransitionScope) {
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .scale(scale)
                        .sharedElement(
                            rememberSharedContentState(key = "auth_logo"),
                            animatedVisibilityScope = animatedContentScope
                        )
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    HoneyGold.copy(alpha = 0.45f),
                                    NectarPurple.copy(alpha = 0.15f),
                                    Color.Transparent
                                )
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text("🐝", style = MaterialTheme.typography.displayMedium)
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
            with(sharedTransitionScope) {
                Text(
                    text = "DreamBees AI",
                    style = MaterialTheme.typography.headlineLarge.copy(
                        brush = Brush.linearGradient(
                            colors = listOf(Color.White, HoneyGold)
                        ),
                        fontWeight = FontWeight.Black
                    ),
                    modifier = Modifier.sharedElement(
                        rememberSharedContentState(key = "auth_title"),
                        animatedVisibilityScope = animatedContentScope
                    )
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Portal to AI Imagination",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.6f)
            )
            Spacer(modifier = Modifier.height(64.dp))
            androidx.compose.material3.CircularProgressIndicator(
                color = HoneyGold,
                modifier = Modifier.size(28.dp),
                strokeWidth = 3.dp
            )
        }
    }
}

@Composable
private fun OfflineScreen(onRetry: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepGarden),
        contentAlignment = Alignment.Center
    ) {
        HoneycombBackground()
        
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(horizontal = 32.dp)
        ) {
            Text("📶", style = MaterialTheme.typography.displayMedium)
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Connection Offline",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "DreamBees requires an active internet connection to authenticate and load neural models. Please check your cellular data or Wi-Fi and retry.",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.7f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Spacer(modifier = Modifier.height(32.dp))
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = HoneyGold, contentColor = Color(0xFF2D1B00)),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            ) {
                Text("Retry Connection ⚡", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun AuthScreen(
    state: AuthState,
    viewModel: AuthViewModel,
    sharedTransitionScope: SharedTransitionScope,
    animatedContentScope: AnimatedContentScope,
    onSignInClick: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val isLoading = state is AuthState.Authenticating
    val googleApiAvailability = remember { com.google.android.gms.common.GoogleApiAvailability.getInstance() }
    val playServicesStatus = remember { googleApiAvailability.isGooglePlayServicesAvailable(context) }
    val isPlayServicesAvailable = playServicesStatus == com.google.android.gms.common.ConnectionResult.SUCCESS

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepGarden),
        contentAlignment = Alignment.Center
    ) {
        HoneycombBackground()
        
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            NectarPurple.copy(alpha = 0.12f),
                            Color.Transparent
                        ),
                        center = Offset(0f, 0f)
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            HoneyGold.copy(alpha = 0.08f),
                            Color.Transparent
                        ),
                        center = Offset(1000f, 2000f)
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            with(sharedTransitionScope) {
                Box(
                    modifier = Modifier
                        .size(90.dp)
                        .sharedElement(
                            rememberSharedContentState(key = "auth_logo"),
                            animatedVisibilityScope = animatedContentScope
                        )
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(HoneyGold, NectarPurple)
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text("🐝", style = MaterialTheme.typography.displaySmall)
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            with(sharedTransitionScope) {
                Text(
                    text = "DreamBees AI",
                    style = MaterialTheme.typography.headlineLarge.copy(
                        brush = Brush.linearGradient(
                            colors = listOf(Color.White, HoneyGold)
                        ),
                        fontWeight = FontWeight.Black
                    ),
                    modifier = Modifier.sharedElement(
                        rememberSharedContentState(key = "auth_title"),
                        animatedVisibilityScope = animatedContentScope
                    )
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Unleash your creative potential. Choose a style, enter your prompt, and watch magic happen.",
                color = Color.White.copy(alpha = 0.7f),
                style = MaterialTheme.typography.bodyMedium,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(48.dp))

            if (isLoading) {
                androidx.compose.material3.CircularProgressIndicator(
                    color = HoneyGold,
                    modifier = Modifier.size(36.dp)
                )
            } else if (!isPlayServicesAvailable) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color(0x26E53935))
                        .border(
                            width = 1.dp,
                            color = Color(0xFFE53935).copy(alpha = 0.4f),
                            shape = RoundedCornerShape(20.dp)
                        )
                        .padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("🤖", style = MaterialTheme.typography.titleLarge)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Play Services Required",
                            color = Color(0xFFFF8585),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "Google Play Services is required for Google Sign-In but is currently unavailable or outdated on this device.",
                        color = Color.White.copy(alpha = 0.85f),
                        style = MaterialTheme.typography.bodySmall
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = {
                            if (context is android.app.Activity) {
                                googleApiAvailability.showErrorDialogFragment(
                                    context,
                                    playServicesStatus,
                                    9000
                                )
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE53935), contentColor = Color.White),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) {
                        Text("Resolve Play Services Issue", fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                Button(
                    onClick = onSignInClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .border(
                            1.dp,
                            Color.White.copy(alpha = 0.15f),
                            RoundedCornerShape(18.dp)
                        ),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color.Black
                    ),
                    shape = RoundedCornerShape(18.dp),
                    elevation = ButtonDefaults.buttonElevation(
                        defaultElevation = 2.dp,
                        pressedElevation = 4.dp
                    )
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text("G", fontWeight = FontWeight.Bold, color = Color(0xFF4285F4), style = MaterialTheme.typography.titleLarge)
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = "Continue with Google",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1F1F1F)
                        )
                    }
                }
            }

            if (state is AuthState.Error) {
                Spacer(modifier = Modifier.height(20.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(if (state.isDeveloperError) Color(0x28FF9800) else Color(0x1FFF5959))
                        .border(
                            width = 1.dp,
                            color = if (state.isDeveloperError) Color(0xFFFF9800).copy(alpha = 0.5f) else Color(0xFFFF5959).copy(alpha = 0.4f),
                            shape = RoundedCornerShape(20.dp)
                        )
                        .padding(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(if (state.isDeveloperError) "⚙️" else "⚠️", style = MaterialTheme.typography.titleMedium)
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = if (state.isDeveloperError) "Developer Setup Needed" else "Authentication Issue",
                            color = if (state.isDeveloperError) Color(0xFFFFB74D) else Color(0xFFFF8585),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = state.message,
                        color = Color.White.copy(alpha = 0.85f),
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Normal
                    )

                    if (state.isDeveloperError && state.debugCode == 10) {
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = "Troubleshooting steps:",
                            color = Color.White.copy(alpha = 0.9f),
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        val steps = listOf(
                            "1. Run `./gradlew signingReport` in terminal to get SHA-1.",
                            "2. Open Firebase Console and select this project.",
                            "3. Add your SHA-1 fingerprint under App Settings.",
                            "4. Download the updated google-services.json and copy it to the app/ directory."
                        )
                        steps.forEach { step ->
                            Text(
                                text = step,
                                color = Color.White.copy(alpha = 0.75f),
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}