package com.dreambees.android.domain.services

object PromptRules {
    const val maxPromptLength: Int = 1_000

    fun clean(input: String): String = input.trim().take(maxPromptLength)

    fun canSubmit(input: String): Boolean = clean(input).isNotBlank()
}