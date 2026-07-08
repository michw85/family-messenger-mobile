plugins {
    id("bonds.kmp.library")
    id("bonds.compose")
}

kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(projects.core.localization)
        }
    }
}
