package com.pnutdownloader



import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.chaquo.python.PyObject

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
            val module = py.getModule("youtube_downloader")
            val result = module.callAttr("get_video_info", url)
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("Python Error", e)
        }
    }

    @ReactMethod
    fun downloadVideo(url: String, formatType: String, quality: String, promise: Promise) {
        try {
            val py = Python.getInstance()
            val module = py.getModule("youtube_downloader")
            val result = module.callAttr("download_video", url, formatType, quality)
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("Python Error", e)
        }
    }
}