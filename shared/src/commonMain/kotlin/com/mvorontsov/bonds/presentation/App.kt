package com.mvorontsov.bonds.presentation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import coil3.ImageLoader
import coil3.compose.setSingletonImageLoaderFactory
import coil3.network.ktor3.KtorNetworkFetcherFactory
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.localization.LocalAppLocale
import com.mvorontsov.bonds.core.localization.LocaleController
import com.mvorontsov.bonds.core.session.SessionStorage
import com.mvorontsov.bonds.feature.auth.api.AuthComponent
import com.mvorontsov.bonds.feature.chatroom.api.ChatRoomComponent
import com.mvorontsov.bonds.feature.chats.api.ChatsComponent
import com.mvorontsov.bonds.presentation.navigation.ChatRoomRoute
import com.mvorontsov.bonds.presentation.navigation.ChatsRoute
import com.mvorontsov.bonds.presentation.navigation.LoginRoute
import com.mvorontsov.bonds.presentation.navigation.RegisterRoute
import io.ktor.client.HttpClient
import org.koin.compose.koinInject

@Composable
fun App() {
    val httpClient = koinInject<HttpClient>()
    setSingletonImageLoaderFactory { context ->
        ImageLoader.Builder(context)
            .components { add(KtorNetworkFetcherFactory(httpClient)) }
            .build()
    }
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
    val chatRoom = koinInject<ChatRoomComponent>()

    val startDestination = if (session.isLoggedIn) ChatsRoute else LoginRoute

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
            chatRoom.ChatRoom(
                chatId = route.chatId,
                chatName = route.chatName,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
