plugins {
    id("bonds.kmp.library")
    id("bonds.compose")
    alias(libs.plugins.kotlinSerialization)
}

kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(projects.feature.auth.api)
            implementation(projects.core.network)
            implementation(projects.core.session)
            implementation(projects.core.localization)
            implementation(projects.core.designsystem)
            implementation(libs.koin.compose)
            implementation(libs.koin.compose.viewmodel)
            implementation(libs.androidx.lifecycle.viewmodelCompose)
            implementation(libs.androidx.lifecycle.runtimeCompose)
            implementation(libs.ktor.client.core)
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.napier)
        }
    }
}
