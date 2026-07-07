package com.mvorontsov.bonds.core.localization

import com.russhwolf.settings.Settings
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Выбранный язык приложения. Тег языка (`"ru"`, `"en"`) или `null` — следовать
 * языку системы. Хранится в Multiplatform-Settings; [language] реактивен, чтобы
 * корень App перекомпоновался и строки перечитались мгновенно при смене.
 */
class LocaleController(private val settings: Settings) {

    private val _language = MutableStateFlow(settings.getStringOrNull(KEY))
    val language: StateFlow<String?> = _language.asStateFlow()

    /** Сменить язык; `null` — системный. */
    fun setLanguage(tag: String?) {
        if (tag == null) settings.remove(KEY) else settings.putString(KEY, tag)
        _language.value = tag
    }

    private companion object {
        const val KEY = "app_language"
    }
}

/** Поддерживаемые языки приложения (тег + родное название для списка выбора). */
enum class AppLanguage(val tag: String, val displayName: String) {
    RUSSIAN("ru", "Русский"),
    ENGLISH("en", "English"),
}
