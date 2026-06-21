package com.mobileapp.picker

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class DirectoryPickerPackage : ReactPackage {

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(DirectoryPickerModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
