package com.mvorontsov.bonds

import android.app.Application
import com.mvorontsov.bonds.di.initApp
import org.koin.android.ext.koin.androidContext

class BondsApp : Application() {
    override fun onCreate() {
        super.onCreate()
        initApp {
            androidContext(this@BondsApp)
        }
    }
}
