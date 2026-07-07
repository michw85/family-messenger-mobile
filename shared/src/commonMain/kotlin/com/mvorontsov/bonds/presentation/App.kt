package com.mvorontsov.bonds.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.localization.LocalAppLocale
import com.mvorontsov.bonds.core.localization.LocaleController
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.app_name
import com.mvorontsov.bonds.core.localization.resources.app_tagline
import com.mvorontsov.bonds.core.platform.getPlatform
import com.mvorontsov.bonds.presentation.navigation.HomeRoute
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.koinInject

/**
 * Корневой composable приложения. Общий для Android и iOS.
 * Оборачивает контент в [BondsTheme] и провайдер локали: при смене языка
 * `key(language)` перекомпоновывает поддерево, строки перечитываются мгновенно.
 */
@Composable
fun App() {
    BondsTheme {
        val localeController = koinInject<LocaleController>()
        val language by localeController.language.collectAsState()
        CompositionLocalProvider(LocalAppLocale provides language) {
            key(language) {
                AppContent()
            }
        }
    }
}

@Composable
private fun AppContent() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = HomeRoute) {
        composable<HomeRoute> {
            HomePlaceholder()
        }
    }
}

@Composable
private fun HomePlaceholder() {
    Scaffold { innerPadding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(innerPadding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(text = "⚡", style = MaterialTheme.typography.displayLarge)
            Text(
                text = stringResource(Res.string.app_name),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = stringResource(Res.string.app_tagline),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                text = getPlatform().name,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
    }
}
