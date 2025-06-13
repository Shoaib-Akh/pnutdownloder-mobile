package com.pnutdownloader

import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class PythonModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val py by lazy {
        if (!Python.isStarted()) {
            Python.start(AndroidPlatform(reactContext))
        }
        Python.getInstance()
    }

    private val downloader by lazy {
        py.getModule("youtube_downloader").callAttr("create_downloader")
    }

    override fun getName(): String = "PythonModule"

    @ReactMethod
    fun setCookies(cookies: String, promise: Promise) {
        try {
            if (cookies.isBlank()) {
                promise.resolve(false)
                return
            }
            
            val result = py.getModule("youtube_downloader")
                .callAttr("set_cookies", downloader, cookies)
            promise.resolve(result.toBoolean())
        } catch (e: Exception) {
            promise.reject("SET_COOKIES_ERROR", "Failed to set cookies: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getVideoInfo(url: String, promise: Promise) {
        try {
            val result = py.getModule("youtube_downloader")
                .callAttr("get_video_info", downloader, url)
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("GET_INFO_ERROR", e)
        }
    }

    @ReactMethod
    fun downloadVideo(
        url: String,
        formatType: String,
        quality: String,
        downloadDir: String?,
        promise: Promise
    ) {
        try {
            val result = py.getModule("youtube_downloader").callAttr(
                "download_video",
                downloader,
                url,
                formatType,
                quality,
                downloadDir
            )
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("DOWNLOAD_ERROR", e)
        }
    }

    @ReactMethod
    fun cleanup(promise: Promise) {
        try {
            // Python's __del__ will handle cleanup
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEANUP_ERROR", e)
        }
    }
}