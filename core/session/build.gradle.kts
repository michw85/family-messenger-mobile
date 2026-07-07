plugins {
    id("bonds.kmp.library")
}

kotlin {
    sourceSets {
        commonMain.dependencies {
            api(libs.koin.core)
            implementation(libs.multiplatform.settings.noArg)
        }
    }
}
