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
import androidx.navigation.toRoute
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.localization.LocalAppLocale
import com.mvorontsov.bonds.core.localization.LocaleController
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.action_back
import com.mvorontsov.bonds.core.session.SessionStorage
import com.mvorontsov.bonds.feature.auth.api.AuthComponent
import com.mvorontsov.bonds.feature.chats.api.ChatsComponent
import com.mvorontsov.bonds.presentation.navigation.ChatRoomRoute
import com.mvorontsov.bonds.presentation.navigation.ChatsRoute
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
    val chats = koinInject<ChatsComponent>()

    val startDestination = if (session.isLoggedIn) ChatsRoute else LoginRoute

    // Переход на список чатов после входа/регистрации (снести стек авторизации).
    val toChats: () -> Unit = {
        navController.navigate(ChatsRoute) {
            popUpTo(LoginRoute) { inclusive = true }
        }
    }

    NavHost(navController = navController, startDestination = startDestination) {
        composable<LoginRoute> {
            auth.Login(
                onLoggedIn = toChats,
                onOpenRegister = { navController.navigate(RegisterRoute) },
            )
        }
        composable<RegisterRoute> {
            auth.Register(
                onRegistered = toChats,
                onBack = { navController.popBackStack() },
            )
        }
        composable<ChatsRoute> {
            chats.Chats(
                onOpenChat = { chatId, chatName ->
                    navController.navigate(ChatRoomRoute(chatId, chatName))
                },
                onLoggedOut = {
                    navController.navigate(LoginRoute) {
                        popUpTo(ChatsRoute) { inclusive = true }
                    }
                },
            )
        }
        composable<ChatRoomRoute> { entry ->
            val route = entry.toRoute<ChatRoomRoute>()
            ChatRoomPlaceholder(
                chatName = route.chatName,
                onBack = { navController.popBackStack() },
            )
        }
    }
}

/** Временный экран чата (Фаза 3) — заменится реальным `feature:chatroom` в Фазе 4. */
@Composable
private fun ChatRoomPlaceholder(chatName: String, onBack: () -> Unit) {
    val colors = BondsTheme.colors
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(colors.gradient))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = "💬", fontSize = 56.sp)
        Text(
            text = chatName,
            style = MaterialTheme.typography.headlineMedium,
            color = colors.primary,
        )
        Spacer(Modifier.height(24.dp))
        OutlinedButton(onClick = onBack) {
            Text(stringResource(Res.string.action_back))
        }
    }
}
