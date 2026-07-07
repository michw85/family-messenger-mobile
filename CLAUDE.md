# Bonds

Кросс-платформенный семейный мессенджер: Kotlin Multiplatform + Compose Multiplatform (Android + iOS, общий UI).

Бэкенд (не меняем): `https://bonds-app.duckdns.org` — REST (`/api`) + STOMP-over-SockJS WebSocket (`/ws`). Базовый пакет — `com.mvorontsov.bonds`.

## Стек

- Kotlin 2.4.0 (K2), AGP 9.2.1, Gradle 9.4.1 — версии только в `gradle/libs.versions.toml`
- Compose Multiplatform 1.11.1, Material 3
- Koin 4.2.1 (DI), Ktor 3.5.0 (сеть: okhttp/darwin), kotlinx.serialization, coroutines, kotlinx-datetime, Napier (логи)
- Krossbow (STOMP-клиент поверх Ktor WebSocket) — realtime-чат
- Multiplatform-Settings — персист сессии/языка; SQLDelight — кэш сообщений (позже)
- Coil 3 — загрузка изображений (аватары, фото в чате)
- Android: compileSdk 37, minSdk 26, targetSdk 37, JVM 11; applicationId `com.mvorontsov.bonds`

## Модули

Многомодульная схема: **`core:*` — только инфраструктура** (сеть, сессия, тема, строки), **`feature:*` — самодостаточные вертикальные срезы** (`data/domain/ui` внутри, включая свои модели); `shared` — umbrella.

- `build-logic` — included build с convention-плагинами:
  - `bonds.kmp.library` — KMP-таргеты (Android library + iOS), namespace из пути модуля, SDK из catalog
  - `bonds.compose` — Compose-плагины + базовые compose-зависимости
- `core:network` — Ktor `HttpClient` (base URL, JWT-интерцептор из `core:session`, content-negotiation, логирование), фабрика STOMP-клиента (Krossbow), общая обработка API-ошибок
- `core:session` — хранение JWT/username на Multiplatform-Settings (`SessionStorage`): пишет `feature:auth`, читает `core:network` (для заголовка) и остальные фичи
- `core:designsystem` — тема `BondsTheme` (тёплый градиент, цвета/типографика/тени), общие UI-атомы (`FloatingClouds`, `ThoughtBubble` — пузыри сообщений, `TypingIndicator`)
- `core:localization` — централизованная локализация: строки в `commonMain/composeResources/values*/strings.xml` (база EN + ru), `Res` публичный (`publicResClass`), `LocaleController` + `LocalAppLocale` (expect/actual) для смены языка в рантайме. ВАЖНО: в модуле включён `android { androidResources { enable = true } }` — иначе строки не пакуются в APK
**Каждая фича = ДВА модуля `:api` + `:impl`:**
- `:feature:X:api` — только интерфейсы/абстракции наружу (публичные контракты для других модулей). Ничего исполняемого. Может быть тонким, пока нет реального кросс-фичевого контракта.
- `:feature:X:impl` — вся реализация, наружу невидима: `data/` (DataSource, DTO), `domain/` (модели, репозитории, use-cases), `ui/` (экраны + ViewModel), `di/` (Koin-модуль). Зависит от своего `:api` + `core:*`.

Фичи:
- `feature:auth` — вход/регистрация: `impl` → data (Ktor DataSource, DTO), domain (`AuthUser`, `AuthRepository`, use-cases), ui (Login/Register + `AuthViewModel`)
- `feature:chats` — список чатов: `impl` → domain (`Chat`), загрузка/создание/удаление, pull-to-refresh, logout, `ChatsViewModel`
- `feature:chatroom` — экран чата: `impl` → domain (`Message`, `MessageSender`), REST-история + STOMP realtime, отправка текст/фото/голос, участники, `ChatRoomViewModel`
- `shared` — umbrella и **composition root**: DI-граф (собирает Koin-модули всех `:impl`), **навигация (CMP Navigation: `NavHost` + type-safe маршруты в `presentation/navigation/Routes.kt`)**, точки входа платформ, iOS-framework `Shared` (static)
- `androidApp` — Android-точка входа (`BondsApp` → Koin, `MainActivity`)
- `iosApp` — Xcode-проект, SwiftUI-обёртка (`iOSApp.swift` → Koin, `ContentView` → `MainViewControllerKt`)

Правила зависимостей:
- `feature:A:impl → feature:B:api` ✅ (только абстракции) — на `:impl` другой фичи `никогда` ❌
- `feature:X:impl → core:*` ✅; `core → core` ✅ (только инфраструктурное)
- `shared → все` (единственное место, где виден любой `:impl` — для сборки DI + NavHost); приложения → только `shared`
- Маршруты — централизованно в `shared`; кросс-фичевая навигация поднимается в `shared` через колбэки (`onOpenChat: (roomId, roomName) -> Unit` и т.п.), фичи друг о друге не знают. `:api` фичи держит контракты, а не маршруты.

**Модели живут внутри фич** (`feature:X/domain/model`) — каждая фича описывает ровно ту форму, что ей нужна (напр. `auth` → `AuthUser{id,username,email,status}`, `chatroom` → `MessageSender{id,username,avatarUrl}`). Общего `core:model` НЕТ: данные между фичами передаём через инфраструктуру (токен/username в `core:session`) и примитивы в навигации, а не общими типами. Если когда-нибудь два модуля реально потребуют один типизированный контракт — заводим `core:model` тогда (YAGNI), не раньше. Кэш сообщений (SQLDelight, `core:database`) — тоже позже, по необходимости.

Новый KMP-модуль — это `build.gradle.kts` из двух строк-плагинов + `include` в settings:

```kotlin
plugins {
    id("bonds.kmp.library")
    id("bonds.compose") // если в модуле есть UI
}
```

## Структура модуля (Clean Architecture)

**Фича `:impl`:**
```
com.mvorontsov.bonds.feature.<name>/
  ui/       — Composable-экраны, ViewModel, контракт State/Event/Effect
  domain/   — model / repository (интерфейсы) / usecase
  data/     — remote (Ktor, DTO) / local / repository (реализации)
  di/       — Koin-модуль фичи
```
**Фича `:api`:** только публичные интерфейсы/контракты (`com.mvorontsov.bonds.feature.<name>.api`).

**`shared`:**
```
com.mvorontsov.bonds/
  presentation/   — App.kt (корень), navigation/Routes.kt
  di/             — AppModules.kt (собирает все :impl-модули), AppInit.kt (initApp())
  core/platform/  — expect/actual Platform
```

## Конвенции

### Нейминг и слои (обязательно)

- `*DataSource` — доступ к источнику данных; `*Repository` — репозитории; `*UseCase` — прослойка между ViewModel и репозиториями (ViewModel НЕ ходит в репозитории напрямую); `*Impl` — реализации интерфейсов
- Модели: `data`-слой оперирует `*Dto` (`@Serializable`, повторяют JSON бэкенда) — лежат в `feature:X/data/remote`; доменные модели — без суффикса, лежат в `feature:X/domain/model`
- Маппинг Dto → доменная модель происходит **внутри UseCase** (мапперы вида `MessageDto.toMessage()`)
- Поток данных: `DataSource(Dto) → RepositoryImpl(Dto) → UseCase —маппер→ ViewModel(модель) → View`

### Презентация: MVVM + MVI

Контракт экрана — три типа: `XxxState` (единый immutable-стейт, `StateFlow`), `XxxEvent` (sealed, события от UI в `fun onEvent(event)`), `XxxEffect` (sealed, разовые эффекты — навигация/снекбары — отдельным `Flow`, не частью стейта).

### Локализация / навигация (обязательно)

- **Все строки — через локализацию** (`core:localization`). Никакого хардкода текста. Новый ключ → во ВСЕ языки (`values` + `values-ru`), в Composable — `stringResource(Res.string.key)`, вне композиции (ViewModel) — `getString(...)` (suspend). Текст НЕ держать в enum/domain — маппинг enum→ресурс делать в UI.
- **Новый экран — через навигацию.** Добавить `@Serializable`-маршрут в `shared/presentation/navigation/Routes.kt` + `composable<Route>` в `NavHost` (App.kt) и продумать системную «назад» (`BackHandler` для оверлеев/состояний; destinations назад ведёт `NavController`).

### Общее

- Максимум кода в `commonMain`; платформенное — через `expect/actual` (actual-файлы: `*.android.kt` / `*.ios.kt`)
- Зависимости регистрируются в `di/AppModules.kt`; вход на обеих платформах — `initApp()`
- Логирование — только Napier (не println/Log)
- Общение и комментарии в коде — на русском, идентификаторы — на английском
- Имена тестов — английский camelCase (`loginWithValidCredentials()`), НЕ кириллица в бэктиках

## Команды

```bash
./gradlew :androidApp:assembleDebug                 # сборка Android APK
./gradlew :shared:testAndroidHostTest               # unit-тесты shared (JVM/host)
./gradlew :shared:allTests                          # тесты всех таргетов (iOS — нужен симулятор)
./gradlew :shared:compileKotlinIosSimulatorArm64    # быстрая проверка компиляции iOS
```

iOS-приложение собирается из Xcode (`iosApp/iosApp.xcodeproj`) или через Run-конфигурацию iosApp в Android Studio.

## Git

Коммиты и пуши делает пользователь сам из Android Studio — не выполнять `git commit`/`git push` без явной просьбы.
