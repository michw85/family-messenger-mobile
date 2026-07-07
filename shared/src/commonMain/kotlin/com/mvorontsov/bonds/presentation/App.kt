package com.mvorontsov.bonds.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.localization.LocalAppLocale
import com.mvorontsov.bonds.core.localization.LocaleController
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.app_name
import com.mvorontsov.bonds.core.localization.resources.auth_logged_in_as
import com.mvorontsov.bonds.core.localization.resources.auth_logout
import com.mvorontsov.bonds.core.session.SessionStorage
import com.mvorontsov.bonds.feature.auth.api.AuthComponent
import com.mvorontsov.bonds.presentation.navigation.HomeRoute
import com.mvorontsov.bonds.presentation.navigation.LoginRoute
import com.mvorontsov.bonds.presentation.navigation.RegisterRoute
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
    val session = koinInject<SessionStorage>()
    val auth = koinInject<AuthComponent>()

    val startDestination = if (session.isLoggedIn) HomeRoute else LoginRoute

    NavHost(navController = navController, startDestination = startDestination) {
        composable<LoginRoute> {
            auth.Login(
                onLoggedIn = {
                    navController.navigate(HomeRoute) {
                        popUpTo(LoginRoute) { inclusive = true }
                    }
                },
                onOpenRegister = { navController.navigate(RegisterRoute) },
            )
        }
        composable<RegisterRoute> {
            auth.Register(
                onRegistered = {
                    navController.navigate(HomeRoute) {
                        popUpTo(LoginRoute) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() },
            )
        }
        composable<HomeRoute> {
            HomePlaceholder(
                username = session.username.orEmpty(),
                onLogout = {
                    session.clear()
                    navController.navigate(LoginRoute) {
                        popUpTo(HomeRoute) { inclusive = true }
                    }
                },
            )
        }
    }
}

/** Временный экран после входа (Фаза 2) — заменится списком чатов в Фазе 3. */
@Composable
private fun HomePlaceholder(username: String, onLogout: () -> Unit) {
    val colors = BondsTheme.colors
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(colors.gradient))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = "⚡", fontSize = 64.sp)
        Text(
            text = stringResource(Res.string.app_name),
            style = MaterialTheme.typography.headlineMedium,
            color = colors.primary,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(Res.string.auth_logged_in_as, username),
            style = MaterialTheme.typography.bodyMedium,
            color = colors.textSecondary,
        )
        Spacer(Modifier.height(24.dp))
        OutlinedButton(onClick = onLogout) {
            Text(stringResource(Res.string.auth_logout))
        }
    }
}
