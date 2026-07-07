package com.mvorontsov.bonds.feature.chatroom.ui.participants

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mvorontsov.bonds.core.designsystem.BondsTheme
import com.mvorontsov.bonds.core.localization.resources.Res
import com.mvorontsov.bonds.core.localization.resources.participants_add
import com.mvorontsov.bonds.core.localization.resources.participants_not_found
import com.mvorontsov.bonds.core.localization.resources.participants_search_hint
import com.mvorontsov.bonds.core.localization.resources.participants_selected
import com.mvorontsov.bonds.core.localization.resources.participants_title
import com.mvorontsov.bonds.feature.chatroom.domain.model.SearchUser
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AddParticipantsSheet(
    chatId: String,
    onDismiss: () -> Unit,
    onAdded: () -> Unit,
    viewModel: AddParticipantsViewModel = koinViewModel { parametersOf(chatId) },
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val sheetState = rememberModalBottomSheetState()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                AddParticipantsEffect.Added -> onAdded()
                AddParticipantsEffect.Dismissed -> onDismiss()
                is AddParticipantsEffect.ShowError -> Unit
            }
        }
    }

    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens

    ModalBottomSheet(
        onDismissRequest = { viewModel.onEvent(AddParticipantsEvent.Dismiss) },
        sheetState = sheetState,
        containerColor = colors.backgroundLight,
    ) {
        Column(modifier = Modifier.padding(horizontal = dimens.xl).padding(bottom = dimens.xl)) {
            Text(
                text = stringResource(Res.string.participants_title),
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.text,
            )
            Spacer(Modifier.size(dimens.md))
            OutlinedTextField(
                value = state.query,
                onValueChange = { viewModel.onEvent(AddParticipantsEvent.QueryChanged(it)) },
                placeholder = { Text(stringResource(Res.string.participants_search_hint)) },
                shape = RoundedCornerShape(dimens.radiusXLarge),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.size(dimens.md))

            if (state.isSearching) {
                Box(Modifier.fillMaxWidth().padding(dimens.lg), Alignment.Center) {
                    CircularProgressIndicator(color = colors.primary)
                }
            } else if (state.results.isEmpty() && state.query.trim().length >= 2) {
                Text(
                    text = stringResource(Res.string.participants_not_found),
                    color = colors.textSecondary,
                    modifier = Modifier.fillMaxWidth().padding(dimens.lg),
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 320.dp),
                    verticalArrangement = Arrangement.spacedBy(dimens.xs),
                ) {
                    items(state.results, key = { it.id }) { user ->
                        UserRow(
                            user = user,
                            selected = user.id in state.selectedIds,
                            onClick = { viewModel.onEvent(AddParticipantsEvent.ToggleUser(user.id)) },
                        )
                    }
                }
            }

            Spacer(Modifier.size(dimens.md))
            HorizontalDivider(color = colors.border)
            Spacer(Modifier.size(dimens.md))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = stringResource(Res.string.participants_selected, state.selectedIds.size),
                    color = colors.textSecondary,
                )
                Button(
                    onClick = { viewModel.onEvent(AddParticipantsEvent.Confirm) },
                    enabled = state.selectedIds.isNotEmpty() && !state.isAdding,
                ) {
                    if (state.isAdding) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = colors.textLight,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(stringResource(Res.string.participants_add))
                    }
                }
            }
        }
    }
}

@Composable
private fun UserRow(user: SearchUser, selected: Boolean, onClick: () -> Unit) {
    val colors = BondsTheme.colors
    val dimens = BondsTheme.dimens
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(dimens.radiusMedium))
            .background(if (selected) colors.accentLight.copy(alpha = 0.4f) else colors.backgroundLight)
            .clickable(onClick = onClick)
            .padding(dimens.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(40.dp).clip(CircleShape).background(colors.accentLight),
            contentAlignment = Alignment.Center,
        ) {
            Text(user.username.take(1).uppercase(), color = colors.primary, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.size(dimens.md))
        Column(modifier = Modifier.weight(1f)) {
            Text(user.username, color = colors.text, fontWeight = FontWeight.Medium)
            Text(user.email, color = colors.textSecondary, fontSize = 12.sp)
        }
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(if (selected) colors.primary else colors.backgroundLight)
                .border(2.dp, if (selected) colors.primary else colors.border, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (selected) Text("✓", color = colors.textLight, fontSize = 14.sp)
        }
    }
}
