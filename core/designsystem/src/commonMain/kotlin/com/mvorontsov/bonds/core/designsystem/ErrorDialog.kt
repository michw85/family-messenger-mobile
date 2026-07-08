package com.mvorontsov.bonds.core.designsystem

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.action_ok
import com.mvorontsov.bonds.core.localization.resources.error_generic
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Единый диалог ошибки (заголовок «Ошибка» + OK). */
@Composable
fun ErrorDialog(message: StringResource, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(Res.string.error_generic)) },
        text = { Text(stringResource(message)) },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(Res.string.action_ok)) }
        },
    )
}
