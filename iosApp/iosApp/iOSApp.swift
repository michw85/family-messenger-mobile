import SwiftUI
import Shared

@main
struct iOSApp: App {
    init() {
        AppInitKt.doInitApp(koinConfig: nil)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}