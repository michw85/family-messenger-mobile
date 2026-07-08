package com.mvorontsov.bonds.feature.chatroom.data.remote

import kotlinx.serialization.Serializable

/** Ответ POST /files/upload/{type}: URL загруженного файла. */
@Serializable
internal data class UploadResponseDto(val url: String)
