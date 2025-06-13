package com.pnutdownloader

import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class PythonModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    init {
        if (!Python.isStarted()) {
            Python.start(AndroidPlatform(reactContext))
        }
    }

    override fun getName(): String {
        return "PythonModule"
    }

    @ReactMethod
    fun getVideoInfo(url: String, promise: Promise) {
        try {
            val py = Python.getInstance()
            val result = py.getModule("youtube_downloader")
                .callAttr("get_video_info", url)
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("PYTHON_ERROR", e)
        }
    }

    @ReactMethod
    fun downloadVideo(url: String, formatType: String, quality: String, downloadDir: String?, promise: Promise) {
        try {
            val py = Python.getInstance()
            val result = py.getModule("youtube_downloader")
                .callAttr("download_video", url, formatType, quality, downloadDir)
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("PYTHON_ERROR", e)
        }
    }
}