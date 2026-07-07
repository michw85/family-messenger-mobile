package com.mvorontsov.bonds.core.localization.domain

import com.mvorontsov.bonds.core.localization.LocaleController
import kotlinx.coroutines.flow.Flow

/** Текущий выбранный язык (тег или null = системный). */
class ObserveAppLanguageUseCase(private val controller: LocaleController) {
    operator fun invoke(): Flow<String?> = controller.language
}

/** Сменить язык приложения (null = системный). */
class SetAppLanguageUseCase(private val controller: LocaleController) {
    operator fun invoke(tag: String?) = controller.setLanguage(tag)
}
