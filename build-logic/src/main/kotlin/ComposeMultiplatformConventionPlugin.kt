import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.artifacts.VersionCatalogsExtension
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.getByType
import org.jetbrains.kotlin.gradle.dsl.KotlinMultiplatformExtension

/**
 * Конвенция Compose Multiplatform: плагины compose + compose-compiler
 * и базовый набор compose-зависимостей в commonMain.
 *
 * Применяется поверх bonds.kmp.library: `id("bonds.compose")`
 */
class ComposeMultiplatformConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply("org.jetbrains.compose")
        pluginManager.apply("org.jetbrains.kotlin.plugin.compose")

        val libs = extensions.getByType<VersionCatalogsExtension>().named("libs")
        fun lib(alias: String) = libs.findLibrary(alias).get()

        extensions.configure<KotlinMultiplatformExtension> {
            sourceSets.named("commonMain") {
                dependencies {
                    implementation(lib("compose-runtime"))
                    implementation(lib("compose-foundation"))
                    implementation(lib("compose-material3"))
                    implementation(lib("compose-ui"))
                    implementation(lib("compose-ui-backhandler"))
                    implementation(lib("compose-components-resources"))
                    implementation(lib("compose-uiToolingPreview"))
                    implementation(lib("compose-materialIconsCore"))
                }
            }
            sourceSets.named("androidMain") {
                dependencies {
                    implementation(lib("compose-uiToolingPreview"))
                }
            }
        }
    }
}
