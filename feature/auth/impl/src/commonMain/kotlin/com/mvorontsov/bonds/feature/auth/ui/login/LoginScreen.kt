package com.mvorontsov.bonds.feature.auth.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.app_name
import com.mvorontsov.bonds.core.localization.resources.auth_create_account
import com.mvorontsov.bonds.core.localization.resources.auth_login
import com.mvorontsov.bonds.core.localization.resources.auth_password_hint
import com.mvorontsov.bonds.core.localization.resources.auth_tagline
import com.mvorontsov.bonds.core.localization.resources.auth_username_hint
import com.mvorontsov.bonds.core.designsystem.ErrorDialog
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

@Composable
internal fun LoginScreen(
    onLoggedIn: () -> Unit,
    onOpenRegister: () -> Unit,
    viewModel: LoginViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var errorMessage by remember { mutableStateOf<StringResource?>(null) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LoginEffect.LoggedIn -> onLoggedIn()
                LoginEffect.NavigateToRegister -> onOpenRegister()
                is LoginEffect.ShowError -> errorMessage = effect.message
            }
        }
    }

    errorMessage?.let { message ->
        ErrorDialog(message = message, onDismiss = { errorMessage = null })
    }

    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens

    Scaffold(
        containerColor = Color.Transparent,
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(colors.gradient))
                .padding(innerPadding),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = dimens.xl)
                    .imePadding(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(text = "⚡", fontSize = 64.sp)
                Text(
                    text = stringResource(Res.string.app_name),
                    style = MaterialTheme.typography.displaySmall,
                    color = colors.primary,
                )
                Text(
                    text = stringResource(Res.string.auth_tagline),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.textSecondary,
                )
                Spacer(Modifier.height(dimens.xxl))

                OutlinedTextField(
                    value = state.username,
                    onValueChange = { viewModel.onEvent(LoginEvent.UsernameChanged(it)) },
                    placeholder = { Text(stringResource(Res.string.auth_username_hint)) },
                    singleLine = true,
                    enabled = !state.isLoading,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(dimens.md))
                OutlinedTextField(
                    value = state.password,
                    onValueChange = { viewModel.onEvent(LoginEvent.PasswordChanged(it)) },
                    placeholder = { Text(stringResource(Res.string.auth_password_hint)) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    enabled = !state.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(dimens.xl))

                Button(
                    onClick = { viewModel.onEvent(LoginEvent.Submit) },
                    enabled = !state.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = colors.textLight,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(stringResource(Res.string.auth_login))
                    }
                }
                TextButton(
                    onClick = { viewModel.onEvent(LoginEvent.OpenRegister) },
                    enabled = !state.isLoading,
                ) {
                    Text(stringResource(Res.string.auth_create_account), color = colors.primary)
                }
            }
        }
    }
}
