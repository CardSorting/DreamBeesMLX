package com.dreambees.android.domain.models

enum class GenerationStage(val label: String) {
    Idle("Ready"),
    Submitting("Planting the idea"),
    Queued("Finding a creative worker"),
    Processing("Painting with pixels"),
    Finalizing("Polishing the image"),
    Complete("Picture ready"),
}

data class GenerationRequest(
    val prompt: String,
    val model: DreamBeeModel,
    val aspectRatio: AspectRatio,
    val mode: DreamTrailMode,
)

data class GenerationHistoryItem(
    val id: String,
    val prompt: String,
    val modelName: String,
    val aspectRatio: AspectRatio,
    val mode: DreamTrailMode,
    val createdAtLabel: String,
    val imageUrl: String? = null,
    val timestampMs: Long = 0L,
)