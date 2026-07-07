package com.mvorontsov.bonds.core.platform

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform
