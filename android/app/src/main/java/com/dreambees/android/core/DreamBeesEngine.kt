package com.dreambees.android.core

import com.dreambees.android.domain.models.AspectRatio
import com.dreambees.android.domain.models.DreamBeeModel
import com.dreambees.android.domain.models.DreamTrailMode
import com.dreambees.android.domain.models.GenerationHistoryItem
import com.dreambees.android.domain.models.GenerationStage
import com.dreambees.android.domain.services.PromptRules

class DreamBeesEngine {
    fun withModels(state: DreamBeesCoreState, models: List<DreamBeeModel>): DreamBeesCoreState {
        val activeModels = models.filter { it.isActive }.sortedBy { it.order }
        return state.copy(
            models = activeModels,
            selectedModel = state.selectedModel ?: activeModels.firstOrNull(),
        )
    }

    fun selectModel(state: DreamBeesCoreState, model: DreamBeeModel): DreamBeesCoreState =
        state.copy(selectedModel = model)

    fun updatePrompt(state: DreamBeesCoreState, prompt: String): DreamBeesCoreState =
        state.copy(prompt = PromptRules.clean(prompt))

    fun updateMode(state: DreamBeesCoreState, mode: DreamTrailMode): DreamBeesCoreState =
        state.copy(mode = mode)

    fun updateAspectRatio(state: DreamBeesCoreState, aspectRatio: AspectRatio): DreamBeesCoreState =
        state.copy(aspectRatio = aspectRatio)

    fun canCreate(state: DreamBeesCoreState): Boolean =
        PromptRules.canSubmit(state.prompt) &&
            state.selectedModel != null &&
            state.isSignedIn &&
            !state.isOffline &&
            !state.isGenerating &&
            (state.wallet.hasUnlimitedCredits || (state.wallet.zaps ?: 0.0) > 0.0)

    fun blockReason(state: DreamBeesCoreState): String? = when {
        state.isGenerating || canCreate(state) -> null
        state.isOffline -> "You need internet"
        !state.isSignedIn -> "Sign in first"
        state.selectedModel == null -> "Pick a style"
        !PromptRules.canSubmit(state.prompt) -> "Write what you want"
        !state.wallet.hasUnlimitedCredits && (state.wallet.zaps ?: 0.0) <= 0.0 -> "No Zaps left"
        else -> null
    }

    fun generationProgress(state: DreamBeesCoreState, stage: GenerationStage, progress: Int): DreamBeesCoreState =
        state.copy(isGenerating = stage != GenerationStage.Complete, generationStage = stage, progress = progress.coerceIn(0, 100))

    fun completeGeneration(state: DreamBeesCoreState, item: GenerationHistoryItem): DreamBeesCoreState =
        state.copy(
            prompt = "",
            isGenerating = false,
            generationStage = GenerationStage.Complete,
            progress = 100,
            history = listOf(item) + state.history,
        )
}