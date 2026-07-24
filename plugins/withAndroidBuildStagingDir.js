const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Windows' 260-char MAX_PATH breaks CMake's generated object paths for native
 * modules (react-native-reanimated, react-native-webrtc, ...) when the default
 * .cxx staging directory nests under the project's own (long) absolute path.
 * Redirecting it to a short, fixed path works around this. Only relevant on
 * Windows dev machines; harmless no-op elsewhere since the path just wouldn't
 * be used as a build host.
 */
module.exports = function withAndroidBuildStagingDir(config) {
    // Не применять на CI/не-Windows хостах - путь "D:/n" бессмысленен там же,
    // а сама проблема (260-символьный MAX_PATH) существует только на Windows.
    // Skip on CI/non-Windows hosts - the "D:/n" path is meaningless there,
    // and the underlying problem (260-char MAX_PATH) only exists on Windows.
    if (process.platform !== 'win32') {
        return config;
    }
    return withAppBuildGradle(config, (config) => {
        if (config.modResults.contents.includes('buildStagingDirectory')) {
            return config;
        }
        config.modResults.contents = config.modResults.contents.replace(
            /android\s*\{/,
            `android {\n    externalNativeBuild {\n        cmake {\n            buildStagingDirectory "D:/n"\n        }\n    }\n`
        );
        return config;
    });
};
