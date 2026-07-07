package com.mvorontsov.bonds.feature.chats.ui.create

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.action_cancel
import com.mvorontsov.bonds.core.localization.resources.chats_create
import com.mvorontsov.bonds.core.localization.resources.chats_create_title
import com.mvorontsov.bonds.core.localization.resources.chats_group_switch
import com.mvorontsov.bonds.core.localization.resources.chats_name_hint
import org.jetbrains.compose.resources.stringResource

/** Диалог создания чата: название + переключатель групповой/личный. */
@Composable
internal fun CreateChatDialog(
    onConfirm: (name: String, isGroup: Boolean) -> Unit,
    onDismiss: () -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var isGroup by remember { mutableStateOf(true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(Res.string.chats_create_title)) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = { Text(stringResource(Res.string.chats_name_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = stringResource(Res.string.chats_group_switch),
                        modifier = Modifier.weight(1f),
                    )
                    Switch(checked = isGroup, onCheckedChange = { isGroup = it })
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { if (name.isNotBlank()) onConfirm(name, isGroup) },
                enabled = name.isNotBlank(),
            ) { Text(stringResource(Res.string.chats_create)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(Res.string.action_cancel)) }
        },
    )
}
