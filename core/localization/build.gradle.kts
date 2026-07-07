plugins {
    id("bonds.kmp.library")
    id("bonds.compose")
}

kotlin {
    // Включаем Android-ресурсы, иначе composeResources не пакуются в APK
    // (строки локализации не попадали бы в приложение → MissingResourceException)
    android {
        androidResources {
            enable = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            api(libs.koin.core)
            implementation(libs.multiplatform.settings.noArg)
            implementation(libs.kotlinx.coroutines.core)
        }
    }
}

// Строки локализации лежат в commonMain/composeResources; Res публичный,
// чтобы остальные модули обращались к нему через единый core:localization.
compose.resources {
    publicResClass = true
    packageOfResClass = "com.mvorontsov.bonds.core.localization.resources"
    generateResClass = always
}
