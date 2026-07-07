plugins {
    id("bonds.kmp.library")
    id("bonds.compose")
    alias(libs.plugins.kotlinSerialization)
}

kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(projects.feature.chatroom.api)
            implementation(projects.core.network)
            implementation(projects.core.session)
            implementation(projects.core.localization)
            implementation(projects.core.designsystem)
            implementation(libs.koin.compose)
            implementation(libs.koin.compose.viewmodel)
            implementation(libs.compose.materialIconsExtended)
            implementation(libs.androidx.lifecycle.viewmodelCompose)
            implementation(libs.androidx.lifecycle.runtimeCompose)
            implementation(libs.ktor.client.core)
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.datetime)
            implementation(libs.krossbow.stomp.core)
            implementation(libs.krossbow.websocket.ktor)
            implementation(libs.napier)
        }
    }
}
