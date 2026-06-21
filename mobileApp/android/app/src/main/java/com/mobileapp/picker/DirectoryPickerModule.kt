package com.mobileapp.picker

import android.app.Activity
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class DirectoryPickerModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var pendingPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "DirectoryPicker"

  @Suppress("DEPRECATION")
  @ReactMethod
  fun pickDirectory(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No current activity")
      return
    }

    pendingPromise = promise
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
    activity.startActivityForResult(intent, PICK_DIRECTORY_REQUEST)
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != PICK_DIRECTORY_REQUEST) return

    val promise = pendingPromise
    pendingPromise = null
    if (promise == null) return

    if (resultCode != Activity.RESULT_OK || data == null) {
      promise.resolve(null)
      return
    }

    val uri = data.data ?: run {
      promise.resolve(null)
      return
    }

    val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
    try {
      activity.contentResolver.takePersistableUriPermission(uri, takeFlags)
    } catch (_: SecurityException) {
      // persistable permission not always available
    }

    promise.resolve(uri.toString())
  }

  override fun onNewIntent(intent: Intent) {}

  companion object {
    private const val PICK_DIRECTORY_REQUEST = 1001
  }
}
