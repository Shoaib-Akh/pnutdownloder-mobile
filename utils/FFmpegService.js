import { NativeModules, Platform } from 'react-native';
const { FFmpegModule } = NativeModules;

export const executeFFmpegCommand = async (command) => {
  try {
    if (!command) {
      throw new Error('FFmpeg command cannot be empty');
    }

    console.log('Executing FFmpeg command:', command);
    const startTime = Date.now();
    
    const result = await FFmpegModule.executeCommand(command);
    
    const executionTime = (Date.now() - startTime) / 1000;
    console.log(`FFmpeg command completed in ${executionTime}s. Output:`, result);
    
    return {
      success: true,
      output: result,
      executionTime
    };
  } catch (error) {
    console.error('FFmpeg command failed:', {
      command,
      error: error.message,
      stack: error.stack
    });
    
    throw new Error(`FFmpeg processing failed: ${error.message}`);
  }
};

export const getFFmpegVersion = async () => {
  try {
    console.log('Fetching FFmpeg version...');
    const versionInfo = await FFmpegModule.getVersion();
    
    // Extract version number from typical FFmpeg version output
    const versionMatch = versionInfo.match(/ffmpeg version (\S+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    
    return {
      fullInfo: versionInfo,
      version,
      platform: Platform.OS
    };
  } catch (error) {
    console.error('Failed to get FFmpeg version:', error);
    throw new Error(`Version check failed: ${error.message}`);
  }
};

export const checkFFmpegCapabilities = async () => {
  try {
    const [version, codecs] = await Promise.all([
      getFFmpegVersion(),
      executeFFmpegCommand('-codecs')
    ]);
    
    return {
      version: version.version,
      codecs: codecs.output,
      available: true
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
};