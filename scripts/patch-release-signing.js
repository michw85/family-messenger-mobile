#!/usr/bin/env node
/**
 * android/ пересоздаётся с нуля каждым `expo prebuild --clean`, поэтому
 * релизную подпись нельзя один раз прописать в android/app/build.gradle -
 * его перезапишет следующий prebuild. Патчим свежесгенерированный файл сразу
 * после prebuild (тем же способом, что и debug.keystore уже копируется в
 * build-android.yml), а не храним кастомный шаблон gradle-файла.
 *
 * android/ is regenerated from scratch by every `expo prebuild --clean`, so
 * release signing can't just be written into android/app/build.gradle once -
 * the next prebuild would overwrite it. We patch the freshly generated file
 * right after prebuild instead (the same approach already used to copy
 * debug.keystore in build-android.yml), rather than maintaining a custom
 * gradle file template.
 */
const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
let contents = fs.readFileSync(buildGradlePath, 'utf8');

const signingConfigsAnchor = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const signingConfigsReplacement = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(System.getenv("BONDS_RELEASE_STORE_FILE") ?: "release.jks")
            storePassword System.getenv("BONDS_RELEASE_STORE_PASSWORD")
            keyAlias System.getenv("BONDS_RELEASE_KEY_ALIAS")
            keyPassword System.getenv("BONDS_RELEASE_KEY_PASSWORD")
        }
    }`;

const releaseBuildTypeAnchor = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const releaseBuildTypeReplacement = `        release {
            signingConfig signingConfigs.release`;

if (!contents.includes(signingConfigsAnchor)) {
    throw new Error('patch-release-signing: signingConfigs anchor not found - has the Expo prebuild template changed?');
}
if (!contents.includes(releaseBuildTypeAnchor)) {
    throw new Error('patch-release-signing: release buildType anchor not found - has the Expo prebuild template changed?');
}

contents = contents.replace(signingConfigsAnchor, signingConfigsReplacement);
contents = contents.replace(releaseBuildTypeAnchor, releaseBuildTypeReplacement);

fs.writeFileSync(buildGradlePath, contents);
console.log('Patched android/app/build.gradle with the release signing config.');
