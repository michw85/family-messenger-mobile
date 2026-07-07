package com.mvorontsov.bonds.feature.auth.ui.register

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.auth_confirm_password_hint
import com.mvorontsov.bonds.core.localization.resources.auth_create_account
import com.mvorontsov.bonds.core.localization.resources.auth_email_hint
import com.mvorontsov.bonds.core.localization.resources.auth_have_account
import com.mvorontsov.bonds.core.localization.resources.auth_join_subtitle
import com.mvorontsov.bonds.core.localization.resources.auth_join_title
import com.mvorontsov.bonds.core.localization.resources.auth_password_hint
import com.mvorontsov.bonds.core.localization.resources.auth_username_hint
import org.jetbrains.compose.resources.getString
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

@Composable
internal fun RegisterScreen(
    onRegistered: () -> Unit,
    onBack: () -> Unit,
    viewModel: RegisterViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                RegisterEffect.Registered -> onRegistered()
                RegisterEffect.NavigateBack -> onBack()
                is RegisterEffect.ShowError -> snackbarHostState.showSnackbar(getString(effect.message))
            }
        }
    }

    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens

    Scaffold(
        containerColor = Color.Transparent,
        snackbarHost = { SnackbarHost(snackbarHostState) },
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
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = dimens.xl)
                    .imePadding(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(text = "🕊️", fontSize = 56.sp)
                Text(
                    text = stringResource(Res.string.auth_join_title),
                    style = MaterialTheme.typography.headlineMedium,
                    color = colors.primary,
                )
                Text(
                    text = stringResource(Res.string.auth_join_subtitle),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.textSecondary,
                )
                Spacer(Modifier.height(dimens.xl))

                OutlinedTextField(
                    value = state.username,
                    onValueChange = { viewModel.onEvent(RegisterEvent.UsernameChanged(it)) },
                    placeholder = { Text(stringResource(Res.string.auth_username_hint)) },
                    singleLine = true,
                    enabled = !state.isLoading,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(dimens.md))
                OutlinedTextField(
                    value = state.email,
                    onValueChange = { viewModel.onEvent(RegisterEvent.EmailChanged(it)) },
                    placeholder = { Text(stringResource(Res.string.auth_email_hint)) },
                    singleLine = true,
                    enabled = !state.isLoading,
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.None,
                        keyboardType = KeyboardType.Email,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(dimens.md))
                OutlinedTextField(
                    value = state.password,
                    onValueChange = { viewModel.onEvent(RegisterEvent.PasswordChanged(it)) },
                    placeholder = { Text(stringResource(Res.string.auth_password_hint)) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    enabled = !state.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(dimens.md))
                OutlinedTextField(
                    value = state.confirmPassword,
                    onValueChange = { viewModel.onEvent(RegisterEvent.ConfirmPasswordChanged(it)) },
                    placeholder = { Text(stringResource(Res.string.auth_confirm_password_hint)) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    enabled = !state.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(dimens.xl))

                Button(
                    onClick = { viewModel.onEvent(RegisterEvent.Submit) },
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
                        Text(stringResource(Res.string.auth_create_account))
                    }
                }
                TextButton(
                    onClick = { viewModel.onEvent(RegisterEvent.Back) },
                    enabled = !state.isLoading,
                ) {
                    Text(stringResource(Res.string.auth_have_account), color = colors.primary)
                }
            }
        }
    }
}
