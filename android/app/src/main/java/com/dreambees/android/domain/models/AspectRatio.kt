package com.dreambees.android.domain.models

enum class AspectRatio(
    val label: String,
    val value: String,
    val description: String,
) {
    Square("Square", "1:1", "Profile pictures, stickers, icons"),
    Portrait("Portrait", "3:4", "Characters, posters, phone wallpapers"),
    Landscape("Landscape", "4:3", "Scenes, products, cozy worlds"),
    Wide("Widescreen", "16:9", "Cinematic images and banners"),
}