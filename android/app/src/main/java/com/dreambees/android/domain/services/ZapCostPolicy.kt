package com.dreambees.android.domain.services

object ZapCostPolicy {
    fun costFor(modelId: String, tier: String): Double = when {
        modelId == "anima" -> 0.0
        modelId in setOf("wai-illustrious", "nova-3d-cg-xl") -> 1.0
        tier == "pro" || tier == "architect" -> 0.0
        modelId == "z-image-turbo-a100" -> 0.5
        else -> 0.25
    }
}