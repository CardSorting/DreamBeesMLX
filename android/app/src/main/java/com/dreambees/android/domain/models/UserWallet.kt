package com.dreambees.android.domain.models

data class UserWallet(
    val tier: String = "free",
    val zaps: Double? = 10.0,
    val nextDripSeconds: Int = 0,
) {
    val hasUnlimitedCredits: Boolean = zaps == null

    fun displayText(): String = if (hasUnlimitedCredits) {
        "Unlimited credits"
    } else if (zaps == 10.0) {
        "10/10 Zaps Max"
    } else {
        val mins = nextDripSeconds / 60
        val secs = nextDripSeconds % 60
        val timeStr = String.format("%02d:%02d", mins, secs)
        "${zaps?.toInt() ?: 0}/10 Zaps (+1 in $timeStr)"
    }
}