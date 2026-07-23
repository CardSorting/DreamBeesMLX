package com.dreambees.android.domain.models

data class DreamBeeModel(
    val id: String,
    val name: String,
    val description: String,
    val imageUrl: String,
    val type: String,
    val order: Int,
    val isActive: Boolean = true,
) {
    val isFree: Boolean = id == "anima"
}