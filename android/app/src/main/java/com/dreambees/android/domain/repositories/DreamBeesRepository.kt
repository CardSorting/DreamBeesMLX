package com.dreambees.android.domain.repositories

import com.dreambees.android.domain.models.DreamBeeModel
import com.dreambees.android.domain.models.GenerationHistoryItem
import com.dreambees.android.domain.models.GenerationRequest

interface DreamBeesRepository {
    suspend fun loadModels(): List<DreamBeeModel>
    suspend fun createGeneration(request: GenerationRequest): GenerationHistoryItem
}