plugins {
    `kotlin-dsl`
}

dependencies {
    // compileOnly: в рантайме плагины приходят из classpath корневого проекта
    // (root build.gradle.kts применяет их с apply false)
    compileOnly(libs.android.gradlePlugin)
    compileOnly(libs.kotlin.gradlePlugin)
    compileOnly(libs.compose.gradlePlugin)
    compileOnly(libs.composeCompiler.gradlePlugin)
}

gradlePlugin {
    plugins {
        register("kmpLibrary") {
            id = "bonds.kmp.library"
            implementationClass = "KmpLibraryConventionPlugin"
        }
        register("composeMultiplatform") {
            id = "bonds.compose"
            implementationClass = "ComposeMultiplatformConventionPlugin"
        }
    }
}
