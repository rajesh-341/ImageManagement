package com.mobileapp.update

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File

class UpdateModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "UpdateModule"

    @ReactMethod
    fun installApk(apkPath: String, promise: Promise) {
        try {
            val file = File(apkPath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "APK file not found at $apkPath")
                return
            }

            val uri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                FileProvider.getUriForFile(
                    reactApplicationContext,
                    "${reactApplicationContext.packageName}.fileprovider",
                    file
                )
            } else {
                Uri.fromFile(file)
            }

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INSTALL_ERROR", e.message, e)
        }
    }
}
