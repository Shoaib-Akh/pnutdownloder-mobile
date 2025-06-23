package com.pnutdownloader

import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegSession
import com.arthenica.ffmpegkit.ReturnCode
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.Executors

class FFmpegModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val executor = Executors.newSingleThreadExecutor()
    
    override fun getName() = "FFmpegModule"

    @ReactMethod
    fun executeCommand(command: String, promise: Promise) {
        executor.execute {
            try {
                if (command.isBlank()) {
                    promise.reject("INVALID_COMMAND", "FFmpeg command cannot be empty")
                    return@execute
                }

                val outputBuilder = StringBuilder()
                
                val session = FFmpegKit.execute(command)
                session.allLogs.forEach { log ->
                    outputBuilder.append(log.message).append("\n")
                }

                if (ReturnCode.isSuccess(session.returnCode)) {
                    promise.resolve(outputBuilder.toString())
                } else {
                    val errorMsg = buildString {
                        append("FFmpeg command failed\n")
                        append("Command: $command\n")
                        append("Return code: ${session.returnCode}\n")
                        append("Output:\n${outputBuilder.toString()}")
                        session.failStackTrace?.let { append("Stack trace: $it") }
                    }
                    promise.reject("FFMPEG_ERROR", errorMsg)
                }
            } catch (ex: Exception) {
                promise.reject("FFMPEG_EXCEPTION", "FFmpeg execution error: ${ex.message}", ex)
            }
        }
    }

    @ReactMethod
    fun getVersion(promise: Promise) {
        executeCommand("-version", promise)
    }

    override fun invalidate() {
        executor.shutdown()
        super.invalidate()
    }
}