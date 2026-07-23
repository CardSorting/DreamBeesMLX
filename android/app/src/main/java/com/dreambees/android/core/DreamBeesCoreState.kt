package com.dreambees.android.core

import com.dreambees.android.domain.models.AspectRatio
import com.dreambees.android.domain.models.DreamBeeModel
import com.dreambees.android.domain.models.DreamTrailMode
import com.dreambees.android.domain.models.GenerationHistoryItem
import com.dreambees.android.domain.models.GenerationStage
import com.dreambees.android.domain.models.UserWallet

data class DreamBeesCoreState(
    val models: List<DreamBeeModel> = emptyList(),
    val selectedModel: DreamBeeModel? = null,
    val prompt: String = "",
    val mode: DreamTrailMode = DreamTrailMode.Balanced,
    val aspectRatio: AspectRatio = AspectRatio.Square,
    val wallet: UserWallet = UserWallet(),
    val isSignedIn: Boolean = true,
    val isGuest: Boolean = true,
    val isOffline: Boolean = false,
    val isGenerating: Boolean = false,
    val generationStage: GenerationStage = GenerationStage.Idle,
    val progress: Int = 0,
    val history: List<GenerationHistoryItem> = emptyList(),
)