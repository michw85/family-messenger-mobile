package com.mvorontsov.bonds.feature.chatroom.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders

/** Загрузка файлов на бэкенд (multipart), возвращает URL. */
internal class FileRemoteDataSource(private val client: HttpClient) {

    suspend fun upload(type: String, bytes: ByteArray, filename: String, contentType: String): String {
        val response: UploadResponseDto = client.post("files/upload/$type") {
            // снимаем глобальный application/json — multipart задаёт свой Content-Type с boundary
            headers.remove(HttpHeaders.ContentType)
            setBody(
                MultiPartFormDataContent(
                    formData {
                        append(
                            key = "file",
                            value = bytes,
                            headers = Headers.build {
                                append(HttpHeaders.ContentType, contentType)
                                append(HttpHeaders.ContentDisposition, "filename=\"$filename\"")
                            },
                        )
                    },
                ),
            )
        }.body()
        return response.url
    }
}
