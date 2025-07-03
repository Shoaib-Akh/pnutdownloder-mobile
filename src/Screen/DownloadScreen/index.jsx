import React, { useEffect, useState,useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  NativeModules
} from 'react-native';
import RNFS from 'react-native-fs';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { executeFFmpegCommand, getFFmpegVersion } from '../../../utils/FFmpegService';
import { formatDuration } from '../../../utils/formatDuration';

const DownloadScreen = ({ route }) => {

  const { PythonModule } = NativeModules;

  const { downloadedUrl } = route.params || {};
  console.log("downloadedUrldownloadedUrl",downloadedUrl);
  
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownload, setCurrentDownload] = useState(null);
const progressAnim = useRef(new Animated.Value(0)).current;
useEffect(() => {
  Animated.spring(progressAnim, {
    toValue: downloadProgress,
    tension: 30, // Makes the animation more springy
    friction: 8, // Controls how quickly the animation settles
    useNativeDriver: false, // Required for width animations
  }).start();
}, [downloadProgress]);


 const requestStoragePermission = async () => {
  try {
    let permissionToCheck;
    let permissionToRequest;

    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        // Android 13+ (API 33+) - Use granular media permissions
        permissionToCheck = PERMISSIONS.ANDROID.READ_MEDIA_VIDEO;
        permissionToRequest = PERMISSIONS.ANDROID.READ_MEDIA_VIDEO;
      } else if (Platform.Version >= 30) {
        // Android 11+ (API 30+) - Try MANAGE_EXTERNAL_STORAGE first
        try {
          const manageStorageResult = await check(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE);
          if (manageStorageResult === RESULTS.GRANTED) {
            return true;
          }

          const requestResult = await request(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE);
          if (requestResult === RESULTS.GRANTED) {
            return true;
          }
        } catch (manageError) {
          console.log('MANAGE_EXTERNAL_STORAGE not available, falling back to WRITE_EXTERNAL_STORAGE');
        }
        
        // Fall back to WRITE_EXTERNAL_STORAGE if MANAGE_EXTERNAL_STORAGE fails or isn't available
        permissionToCheck = PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
        permissionToRequest = PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
      } else {
        // Android 10 and below (API < 30) - Use WRITE_EXTERNAL_STORAGE
        permissionToCheck = PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
        permissionToRequest = PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
      }
    } else if (Platform.OS === 'ios') {
      // iOS - Use PHOTO_LIBRARY
      permissionToCheck = PERMISSIONS.IOS.PHOTO_LIBRARY;
      permissionToRequest = PERMISSIONS.IOS.PHOTO_LIBRARY;
    }

    // Validate we have permission constants
    if (!permissionToCheck || !permissionToRequest) {
      console.error('Could not determine appropriate permission for this platform/version');
      return false;
    }

    // Check current permission status
    const checkResult = await check(permissionToCheck);
    console.log(`Permission check result: ${checkResult}`);

    if (checkResult === RESULTS.GRANTED) {
      return true;
    }

    // Request permission if not granted
    const requestResult = await request(permissionToRequest);
    console.log(`Permission request result: ${requestResult}`);

    if (requestResult === RESULTS.GRANTED) {
      return true;
    }

    // Handle denied permission
    if (requestResult === RESULTS.DENIED) {
      console.log('Permission denied');
      return false;
    }

    // Handle blocked permission (show settings dialog)
    if (requestResult === RESULTS.BLOCKED) {
      Alert.alert(
        'Permission Required',
        'Storage permission is required to save downloads. Please enable it in app settings.',
        [
          { 
            text: 'Open Settings', 
            onPress: () => openSettings().catch(() => console.log('Cannot open settings'))
          },
          { 
            text: 'Cancel', 
            style: 'cancel' 
          },
        ],
        { cancelable: false }
      );
      return false;
    }

    // Default return if none of the above cases match
    return false;

  } catch (err) {
    console.error('Error in requestStoragePermission:', err);
    Alert.alert(
      'Permission Error',
      'An error occurred while requesting permissions. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
};

  const extractVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:.*[?&]v=|(?:v|embed|shorts|kids|music)\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return url.match(regex)?.[1] || null;
  };

  useEffect(() => {
const fetchVideoData = async () => {
  console.log("downloadedUrl",downloadedUrl);
  
  if (!downloadedUrl) {
    setError('No video URL provided');
    setLoading(false);
    return;
  }

  try {
    setError("")
    setLoading(true);
    const result = await PythonModule.getVideoInfo(downloadedUrl);
    console.log("resultresult",result);
    
    const data = JSON.parse(result);
    if (data.error) {
      setError(data.error);
    } else {
      setVideoData({
        snippet: {
          title: data.title,
          channelTitle: data.channel,
          thumbnails: {
            medium: { url: data.thumbnail }
          }
        },
        statistics: {
          viewCount: data.view_count.toString()
        },
        contentDetails: {
          duration: `PT${Math.floor(data.duration/60)}M${data.duration%60}S`
        }
      });
    }
  } catch (err) {
    console.error('Error fetching video data:', err);
    setError('Failed to load video data. Please try again.');
  } finally {
    setLoading(false);
  }
};
    fetchVideoData();
  }, [downloadedUrl]);



const navigation=useNavigation()
const STORAGE_KEY = '@PNutDownloader/downloads';

const handleDownload = async (formatType, quality) => {
  if (isDownloading) {
    console.log('Download already in progress - aborting');
    Alert.alert('Info', 'A download is already in progress.');
    return;
  }
    if (!downloadedUrl) {
    console.log('Download already in progress - aborting');
    Alert.alert( 'error','No video URL provided');
    return;
  }

  // Check if this exact download already exists
  try {
    const existingDownloads = await AsyncStorage.getItem(STORAGE_KEY) || '[]';
    const downloads = JSON.parse(existingDownloads);
    
    const existingDownload = downloads.find(download => 
      download.url === downloadedUrl && 
      download.type === formatType && 
      download.quality === quality
    );
    
    if (existingDownload) {
      // Check if file still exists
      try {
        const fileExists = await RNFS.exists(existingDownload.filePath);
        
        Alert.alert(
          'Download Exists',
          `This ${formatType} (${quality}) has already been downloaded.${fileExists ? '' : '\n\nFile may have been deleted.'}`,
          [
            { text: 'OK' },
            {
              text: 'View in History',
              onPress: () => navigation.navigate('Playlist')
            },
            !fileExists && {
              text: 'Download Again',
              onPress: () => proceedWithDownload(formatType, quality)
            }
          ].filter(Boolean) // Remove any falsey values from the array
        );
        return;
      } catch (fileCheckError) {
        console.log('Error checking file existence:', fileCheckError);
        // Continue with download if check fails
      }
    }
  } catch (err) {
    console.error('Error checking existing downloads:', err);
    // Continue with download even if check fails
  }

  // Proceed with download if no duplicate found or checks failed
  await proceedWithDownload(formatType, quality);
};

const proceedWithDownload = async (formatType, quality) => {
  const hasPermission = await requestStoragePermission();
  if (!hasPermission) {
    console.log('Storage permission denied');
    return;
  }

  console.log('Starting download process...');
  setIsDownloading(true);
  setDownloadProgress(5); // Start
  setCurrentDownload({ formatType, quality });

  try {
    // Create base directories
    const baseDownloadDir = `${RNFS.DownloadDirectoryPath}/PNutDownloader`;
    const subFolder = formatType === 'video' ? 'Videos' : 'Audio';
    const finalDownloadDir = `${baseDownloadDir}/${subFolder}`;
    
    // Create temp directory inside cache
    const tempDir = `${RNFS.CachesDirectoryPath}/PNutDownloader/temp_${Date.now()}`;
    
    // Ensure directories exist
    await RNFS.mkdir(baseDownloadDir).catch(() => {});
    await RNFS.mkdir(finalDownloadDir).catch(() => {});
    await RNFS.mkdir(tempDir).catch(() => {});
    
    console.log("Folders created. Temp dir:", tempDir);
    setDownloadProgress(10); // Folder setup done

    console.log("Initiating Python download to temp folder...");
    const result = await PythonModule.downloadVideo(
      downloadedUrl,
      formatType,
      quality,
      tempDir // Download to temp folder
    );
    setDownloadProgress(30); // Python download called

    const data = typeof result === 'string' ? JSON.parse(result) : result;
    console.log("Download result:", data);

    if (data.error) throw new Error(data.error || 'Unknown error');

    const tempFiles = await RNFS.readDir(tempDir);
    console.log("Files in temp folder:", tempFiles);

    setDownloadProgress(40); // Downloaded files listed

    // Process files based on format type
    let finalFilePath = '';
    const cleanTitle = data.title
      .replace(/[^\w\s.-]/gi, '_')
      .replace(/\s+/g, '_')
      .substring(0, 80);
    const uniqueId = Date.now();

    if (formatType === 'video') {
      console.log("Processing video files...");

      const videoFile = tempFiles.find(f => 
        f.name.endsWith('.mp4') && !f.name.endsWith('.f140.mp4')
      );
      const audioFile = tempFiles.find(f => 
        f.name.endsWith('.m4a') || f.name.endsWith('.f140.mp4')
      );

      if (!videoFile || !audioFile) {
        throw new Error("Missing video or audio files for merging.");
      }

      setDownloadProgress(50); // Found video/audio

      // Output path in final directory
      finalFilePath = `${finalDownloadDir}/${cleanTitle}_${uniqueId}.mp4`;

      console.log("Merging files:", {
        video: videoFile.path,
        audio: audioFile.path,
        output: finalFilePath,
      });

      const ffmpegCommand = [
        '-i', videoFile.path,
        '-i', audioFile.path,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-strict', 'experimental',
        finalFilePath
      ];

      setDownloadProgress(60); // Starting merge
      await executeFFmpegCommand(ffmpegCommand);
      console.log("FFmpeg merge completed");

      // Verify merge was successful
      if (!(await RNFS.exists(finalFilePath))) {
        throw new Error('Merged file not found');
      }

      setDownloadProgress(80); // Merge done
    } 
    else if (formatType === 'audio') {
      console.log("Processing audio files...");

      const audioFile = tempFiles.find(f => 
        f.name.endsWith('.m4a') || f.name.endsWith('.webm')
      );
      if (!audioFile) throw new Error("Audio file not found for conversion.");

      // Output path in final directory
      finalFilePath = `${finalDownloadDir}/${cleanTitle}_${uniqueId}_${quality}.mp3`;

      // Map kbps to FFmpeg bitrate string
      const bitrateMap = {
        '320kbps': '320k',
        '256kbps': '256k',
        '128kbps': '128k',
        '64kbps': '64k',
      };
      const selectedBitrate = bitrateMap[quality] || '128k';

      const ffmpegCommand = [
        '-i', audioFile.path,
        '-b:a', selectedBitrate,
        '-vn',
        '-ar', '44100',
        '-ac', '2',
        finalFilePath,
      ];

      setDownloadProgress(60); // Starting conversion
      await executeFFmpegCommand(ffmpegCommand);
      console.log("FFmpeg conversion completed");

      if (!(await RNFS.exists(finalFilePath))) {
        throw new Error("Converted audio file not found");
      }

      setDownloadProgress(80); // Conversion done
    }

    // Clean up temp files
    console.log("Cleaning up temp files...");
    await RNFS.unlink(tempDir).catch(e => 
      console.warn("Failed to delete temp folder:", e)
    );

    // Save download info
    const downloadInfo = {
      id: `${uniqueId}-${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      type: formatType,
      quality: quality,
      date: new Date().toISOString(),
      thumbnail: data.thumbnail || videoData?.snippet?.thumbnails?.medium?.url,
      duration: videoData?.contentDetails?.duration,
      channel: videoData?.snippet?.channelTitle,
      url: downloadedUrl,
      filePath: finalFilePath
    };

    const existingDownloads = await AsyncStorage.getItem(STORAGE_KEY) || '[]';
    const downloads = JSON.parse(existingDownloads);
    downloads.unshift(downloadInfo);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(downloads));

    setDownloadProgress(100); // Done!
    console.log("Download completed successfully");

    Alert.alert(
      'Download Complete',
      `${data.title} saved successfully!`,
      [
        { text: 'OK' },
        { text: 'View History', onPress: () => navigation.navigate('Playlist') }
      ]
    );

  } catch (err) {
    console.error("Download error:", err);
    Alert.alert(
      'Download Failed',
      err.message || 'Download could not be completed',
      [
        { text: 'OK' },
        { text: 'Retry', onPress: () => proceedWithDownload(formatType, quality) }
      ]
    );
  } finally {
    setIsDownloading(false);
    setCurrentDownload(null);
    try {
      await PythonModule.removeProgressCallback();
    } catch (e) {
      console.error("Callback removal error:", e);
    }
  }
};

// Helper function
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Helper functions





  const videoQualities = [
    { quality: '1920p', premium: false },
    { quality: '1280p', premium: false },
    { quality: '852p', premium: false },
    { quality: '640p', premium: false },
    { quality: '426p', premium: false },
    { quality: '256p', premium: false },
  ];

  const audioQualities = [
    { quality: '320kbps', premium: false },
    { quality: '256kbps', premium: false },
    { quality: '128kbps', premium: false },
    { quality: '64kbps', premium: false },
  ];



  const interpolateProgress = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}> Video Downloader</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Loading video info...</Text>
          </View>
        ) : error ? (
          <View style={{height:200,alignItems:"center",display:"flex",justifyContent:"center"}}>
          <Text style={styles.errorText}>{error}</Text>

          </View>
        ) : videoData ? (
          <View style={styles.card}>
            <Image
              source={{ uri: videoData.snippet.thumbnails.medium.url }}
              style={styles.thumbnail}
            />
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{videoData.snippet.title}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>📺 Channel: {videoData.snippet.channelTitle}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>
                  👁️ Views: {parseInt(videoData.statistics?.viewCount).toLocaleString() || 'N/A'}
                </Text>
                <Text style={styles.infoText}>⏱️ Duration: {formatDuration(videoData.contentDetails?.duration)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.infoText}>No video data available</Text>
        )}
{isDownloading && (
  <View style={styles.downloadContainer}>
    <Text style={styles.downloadTitle}>
      Downloading {currentDownload?.formatType} ({currentDownload?.quality})
    </Text>
    
    {/* Progress bar container */}
    <View style={styles.progressBarContainer}>
      <Animated.View 
        style={[
          styles.progressFill, 
          { 
            width: progressAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: progressAnim.interpolate({
              inputRange: [0, 50, 100],
              outputRange: ['#ff5722', '#ff9800', '#4caf50'],
            }),
          }
        ]} 
      />
    </View>
    
    {/* Progress text with animation */}
    <Animated.Text 
      style={[
        styles.progressText,
        {
          opacity: progressAnim.interpolate({
            inputRange: [0, 100],
            outputRange: [0.5, 1],
          }),
          transform: [{
            scale: progressAnim.interpolate({
              inputRange: [0, 100],
              outputRange: [0.9, 1.1],
            }),
          }],
        }
      ]}
    >
      {Math.round(downloadProgress)}% - {downloadProgress < 100 ? 'Downloading...' : 'Processing...'}
    </Animated.Text>
  </View>
)}

        <Text style={styles.sectionTitle}>🎬 Video Quality</Text>
        {videoQualities.map((item, index) => (
          <View key={`video-${index}`} style={styles.qualityRow}>
            <Text style={styles.qualityText}>{item.quality}</Text>
            <TouchableOpacity
              onPress={() => handleDownload('video', item.quality)}
              disabled={isDownloading}
              style={[
                styles.button,
                item.premium ? styles.premiumButton : styles.downloadButton,
                isDownloading && styles.disabledButton,
              ]}
            >
              <Text style={styles.buttonText}>{item.premium ? '⚡ Premium' : 'Download'}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.sectionTitle}>🎧 Audio Quality</Text>
        {audioQualities.map((item, index) => (
          <View key={`audio-${index}`} style={styles.qualityRow}>
            <Text style={styles.qualityText}>{item.quality}</Text>
            <TouchableOpacity
              onPress={() => handleDownload('audio', item.quality)}
              disabled={isDownloading}
              style={[
                styles.button,
                item.premium ? styles.premiumButton : styles.downloadButton,
                isDownloading && styles.disabledButton,
              ]}
            >
              <Text style={styles.buttonText}>{item.premium ? '⚡ Premium' : 'Download'}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.footerText}>
          Note: Downloads are saved to your device's Downloads directory
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',

  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  videoInfo: {
    paddingHorizontal: 5,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  qualityText: {
    fontSize: 16,
    color: '#444',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#BB4F28',
  },
  premiumButton: {
    backgroundColor: '#ff5722',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  downloadContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
    downloadContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressBarContainer: {
    height: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});

export default DownloadScreen;