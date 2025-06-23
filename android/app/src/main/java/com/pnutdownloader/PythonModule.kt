package com.pnutdownloader

import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Callback
import android.util.Log

class PythonModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "PythonModule"
    }

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
    fun setFfmpegPath(path: String, promise: Promise) {
        try {
            val result = py.getModule("youtube_downloader")
                .callAttr("set_ffmpeg_path", downloader, path)
            promise.resolve(result.toBoolean())
            Log.d(TAG, "FFmpeg path set successfully: $path")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting FFmpeg path", e)
            promise.reject("SET_FFMPEG_ERROR", "Failed to set FFmpeg path: ${e.message}", e)
        }
    }

    @ReactMethod
    fun setProgressCallback(callback: Callback) {
        try {
            py.getModule("youtube_downloader").callAttr(
                "set_progress_callback", 
                downloader,
                callback
            )
            Log.d(TAG, "Progress callback set successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting progress callback", e)
        }
    }

    @ReactMethod
    fun removeProgressCallback() {
        try {
            py.getModule("youtube_downloader").callAttr(
                "remove_progress_callback", 
                downloader
            )
            Log.d(TAG, "Progress callback removed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error removing progress callback", e)
        }
    }

    @ReactMethod
    fun setCookies(cookies: String, promise: Promise) {
        try {
            if (cookies.isBlank()) {
                Log.w(TAG, "Empty cookies provided")
                promise.resolve(false)
                return
            }
            
            val result = py.getModule("youtube_downloader")
                .callAttr("set_cookies", downloader, cookies)
            promise.resolve(result.toBoolean())
            Log.d(TAG, "Cookies set successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting cookies", e)
            promise.reject("SET_COOKIES_ERROR", "Failed to set cookies: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getVideoInfo(url: String, promise: Promise) {
        try {
            if (url.isBlank()) {
                promise.reject("INVALID_URL", "URL cannot be empty")
                return
            }

            val result = py.getModule("youtube_downloader")
                .callAttr("get_video_info", downloader, url)
            promise.resolve(result.toString())
            Log.d(TAG, "Video info retrieved successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error getting video info", e)
            promise.reject("GET_INFO_ERROR", "Failed to get video info: ${e.message}", e)
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
            if (url.isBlank()) {
                promise.reject("INVALID_URL", "URL cannot be empty")
                return
            }

            if (formatType !in listOf("video", "audio")) {
                promise.reject("INVALID_FORMAT", "Format must be either 'video' or 'audio'")
                return
            }

            val result = py.getModule("youtube_downloader").callAttr(
                "download_video",
                downloader,
                url,
                formatType,
                quality,
                downloadDir
            )
            promise.resolve(result.toString())
            Log.d(TAG, "Video downloaded successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error downloading video", e)
            promise.reject("DOWNLOAD_ERROR", "Failed to download video: ${e.message}", e)
        }
    }

    @ReactMethod
    fun cleanup(promise: Promise) {
        try {
            // Add any cleanup logic here if needed
            promise.resolve(true)
            Log.d(TAG, "Cleanup completed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error during cleanup", e)
            promise.reject("CLEANUP_ERROR", "Failed to cleanup: ${e.message}", e)
        }
    }

    // Add this method to expose constants to React Native
    override fun getConstants(): Map<String, Any> {
        return mapOf(
            "SUPPORTED_FORMATS" to arrayOf("video", "audio"),
            "DEFAULT_QUALITIES" to mapOf(
                "video" to arrayOf("144p", "240p", "360p", "480p", "720p", "1080p"),
                "audio" to arrayOf("64kbps", "128kbps", "192kbps", "256kbps", "320kbps")
            )
        )
    }
}