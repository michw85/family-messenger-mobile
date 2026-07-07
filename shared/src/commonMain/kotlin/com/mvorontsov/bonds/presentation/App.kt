package com.mvorontsov.bonds.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.mvorontsov.bonds.presentation.navigation.HomeRoute

/**
 * Корневой composable приложения. Общий для Android и iOS.
 * Фаза 0 — каркас: тема Material3 + NavHost с одним маршрутом-заглушкой.
 */
@Composable
fun App() {
    MaterialTheme {
        val navController = rememberNavController()
        NavHost(navController = navController, startDestination = HomeRoute) {
            composable<HomeRoute> {
                HomePlaceholder()
            }
        }
    }
}

@Composable
private fun HomePlaceholder() {
    Scaffold { padding ->
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(text = "⚡", style = MaterialTheme.typography.displayLarge)
            Text(text = "Bonds", style = MaterialTheme.typography.headlineMedium)
            Text(text = "KMP каркас готов", style = MaterialTheme.typography.bodyMedium)
        }
    }
}
