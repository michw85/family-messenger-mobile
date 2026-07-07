package com.mvorontsov.bonds.feature.chatroom.domain.mapper

import com.mvorontsov.bonds.feature.chatroom.data.remote.SearchUserDto
import com.mvorontsov.bonds.feature.chatroom.domain.model.SearchUser

internal fun SearchUserDto.toSearchUser(): SearchUser = SearchUser(id, username, email)
