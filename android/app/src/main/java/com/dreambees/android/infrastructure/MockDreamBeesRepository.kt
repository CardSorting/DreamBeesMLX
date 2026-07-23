package com.dreambees.android.infrastructure

import com.dreambees.android.domain.models.AspectRatio
import com.dreambees.android.domain.models.DreamBeeModel
import com.dreambees.android.domain.models.GenerationHistoryItem
import com.dreambees.android.domain.models.GenerationRequest
import com.dreambees.android.domain.repositories.DreamBeesRepository
import kotlinx.coroutines.delay

class MockDreamBeesRepository : DreamBeesRepository {
    override suspend fun loadModels(): List<DreamBeeModel> = builtInModels

    override suspend fun createGeneration(request: GenerationRequest): GenerationHistoryItem {
        delay(450)
        return GenerationHistoryItem(
            id = "android_${System.currentTimeMillis()}",
            prompt = request.prompt,
            modelName = request.model.name,
            aspectRatio = request.aspectRatio,
            mode = request.mode,
            createdAtLabel = "Just now",
            imageUrl = request.model.imageUrl,
        )
    }

    private val builtInModels = listOf(
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
        ),
    )
}

fun AspectRatio.previewLabel(): String = "$label · $value"