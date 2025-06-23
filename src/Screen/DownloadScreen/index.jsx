import React, { useEffect, useState } from 'react';
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
import axios from 'axios';
import RNFS from 'react-native-fs';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import base64 from 'react-native-base64';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFFmpegVersion } from '../../../utils/FFmpegService';

const DownloadScreen = ({ route }) => {
  const testFFmpeg = async () => {
  try {
    const version = await getFFmpegVersion();
    console.log('Full FFmpeg version info:');
    console.log(version); // This will show the actual version output
    
    // Or display it in your UI
  } catch (error) {
    console.error('FFmpeg test failed:', error);
  }
};
useEffect(()=>{

testFFmpeg();

},[])
  const { PythonModule } = NativeModules;

  const { downloadedUrl } = route.params || {};
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownload, setCurrentDownload] = useState(null);
  const progressAnim = new Animated.Value(0);
  const BACKEND_URL = 'http://192.168.1.4:5001';

  const requestStoragePermission = async () => {
    try {
      let permissions = [];

      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          // Android 13+: Request granular media permissions
          permissions = [
            PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
            PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
            PERMISSIONS.ANDROID.READ_MEDIA_AUDIO,
          ];
        } else if (Platform.Version >= 30) {
          // Android 11+: Check MANAGE_EXTERNAL_STORAGE
          const manageStorageResult = await check(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE);
          if (manageStorageResult !== RESULTS.GRANTED) {
            const requestResult = await request(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE);
            if (requestResult !== RESULTS.GRANTED) {
              Alert.alert(
                'Permission Needed',
                'Please allow "All files access" in Settings for this app.',
                [
                  { text: 'Open Settings', onPress: () => openSettings() },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
              return false;
            }
          }
          return true;
        } else {
          // Android 10 and below: Request legacy storage permissions
          permissions = [
            PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
          ];
        }
      } else if (Platform.OS === 'ios') {
        permissions = [PERMISSIONS.IOS.PHOTO_LIBRARY];
      }

      // Check and request permissions
      for (const permission of permissions) {
        const result = await check(permission);
        if (result !== RESULTS.GRANTED) {
          const requestResult = await request(permission);
          if (requestResult !== RESULTS.GRANTED) {
            Alert.alert(
              'Permission Required',
              'Storage permission is required to save downloads. Please enable it in app settings.',
              [
                { text: 'Open Settings', onPress: () => openSettings() },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
            return false;
          }
        }
      }

      console.log('All required permissions granted');
      return true;
    } catch (err) {
      console.error('Permission error:', err);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
      return false;
    }
  };

  const extractVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:.*[?&]v=|(?:v|embed|shorts|kids|music)\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return url.match(regex)?.[1] || null;
  };

  useEffect(() => {
    // const fetchVideoData = async () => {
    //   if (!downloadedUrl) {
    //     setError('No video URL provided');
    //     setLoading(false);
    //     return;
    //   }

    //   try {
    //     const videoId = extractVideoId(downloadedUrl);
    //     if (!videoId) {
    //       setError('Invalid YouTube URL');
    //       setLoading(false);
    //       return;
    //     }

    //     setLoading(true);
    //     const response = await axios.post(`${BACKEND_URL}/video-info`, { url: downloadedUrl });
    //     if (response.data.items?.length > 0) {
    //       setVideoData(response.data.items[0]);
    //     } else {
    //       setError('Video not found');
    //     }
    //   } catch (err) {
    //     console.error('Error fetching video data:', err);
    //     setError('Failed to load video data. Please try again.');
    //   } finally {
    //     setLoading(false);
    //   }
    // };
const fetchVideoData = async () => {
  console.log("downloadedUrl",downloadedUrl);
  
  if (!downloadedUrl) {
    setError('No video URL provided');
    setLoading(false);
    return;
  }

  try {
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

const checkFFmpeg = async () => {
  console.log("FFmpeg test:");

  const result = await PythonModule.testFfmpeg(); // you define this in Python
  console.log("FFmpeg test:", result);
};

useEffect(()=>{checkFFmpeg},[])
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
const navigation=useNavigation()
const STORAGE_KEY = '@PNutDownloader/downloads';

const handleDownload = async (formatType, quality) => {
  if (isDownloading) {
    Alert.alert('Info', 'A download is already in progress.');
    return;
  }

  const hasPermission = await requestStoragePermission();
  if (!hasPermission) return;

  setIsDownloading(true);
  setCurrentDownload({ formatType, quality });
  setDownloadProgress(0);
  progressAnim.setValue(0);

  try {
    // 1. FFmpeg setup with better error handling
    const ffmpegDest = `${RNFS.DocumentDirectoryPath}/ffmpeg`;
    console.log("FFmpeg destination path:", ffmpegDest);

    let ffmpegAvailable = false;
    if (!await RNFS.exists(ffmpegDest)) {
      try {
        await RNFS.copyFileAssets('ffmpeg', ffmpegDest);
        await RNFS.chmod(ffmpegDest, 0o755); // Make executable
        console.log("FFmpeg copied and made executable");
        ffmpegAvailable = true;
      } catch (copyError) {
        console.warn("FFmpeg setup failed:", copyError);
        Alert.alert('Warning', 
          'FFmpeg not available - some features may be limited. Downloads will continue with basic functionality.');
      }
    } else {
      ffmpegAvailable = true;
    }

    if (ffmpegAvailable) {
      try {
        await PythonModule.setFfmpegPath(ffmpegDest);
      } catch (e) {
        console.warn("FFmpeg registration failed:", e);
      }
    }

    // 2. Create download directory with better error handling
    const baseDownloadDir = `${RNFS.DownloadDirectoryPath}/PNutDownloader`;
    const subFolder = formatType === 'video' ? 'Videos' : 'Audio';
    const downloadDir = `${baseDownloadDir}/${subFolder}`;

    try {
      await RNFS.mkdir(baseDownloadDir);
      await RNFS.mkdir(downloadDir);
    } catch (dirError) {
      console.log("Directory creation error (may already exist):", dirError);
    }

    // 3. Set up progress callback (UNCOMMENT THIS)
    // const progressCallback = (progress) => {
    //   setDownloadProgress(progress);
    //   Animated.timing(progressAnim, {
    //     toValue: progress / 100,
    //     duration: 100,
    //     useNativeDriver: false,
    //   }).start();
    // };

    // await PythonModule.setProgressCallback(progressCallback);

    // 4. Start download with timeout
    console.log("Starting download...");
    const downloadPromise = PythonModule.downloadVideo(
      downloadedUrl,
      formatType,
      quality,
      downloadDir
    );

    // Add timeout (30 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Download timeout')), 30000)
    );

    const result = await Promise.race([downloadPromise, timeoutPromise]);
    const data = typeof result === 'string' ? JSON.parse(result) : result;

    console.log("Download result:", data);

    if (data.error) {
      throw new Error(data.error || 'Unknown download error');
    }

    // 5. Post-download processing
    if (Platform.OS === 'android') {
      try {
        await RNFS.scanFile(data.filepath);
      } catch (e) {
        console.warn("Media scan failed:", e);
      }
    }

    // Save download info with size validation
    try {
      const stats = await RNFS.stat(data.filepath);
      if (stats.size < 1024) { // 1KB minimum size check
        throw new Error('Downloaded file is too small, may be corrupted');
      }

      const downloadInfo = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: data.title,
        filepath: data.filepath,
        type: formatType,
        quality: quality,
        date: new Date().toISOString(),
        thumbnail: data.thumbnail || videoInfo?.thumbnail,
        duration: data.duration || videoInfo?.duration,
        size: stats.size,
        url: downloadedUrl,
      };

      const existingDownloads = await AsyncStorage.getItem(STORAGE_KEY) || '[]';
      const downloads = JSON.parse(existingDownloads);
      downloads.unshift(downloadInfo);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(downloads));

      Alert.alert(
        'Download Complete',
        `${data.title} (${formatSize(stats.size)}) saved successfully!`,
        [
          { text: 'OK' },
       
          { 
            text: 'View History', 
            onPress: () => navigation.navigate('Playlist') 
          }
        ]
      );

    } catch (e) {
      console.error("Post-download processing error:", e);
      throw new Error('Failed to complete download: ' + e.message);
    }

  } catch (err) {
    console.error("Download error:", err);
    Alert.alert(
      'Download Failed',
      err.message || 'Download could not be completed',
      [
        { text: 'OK' },
        { 
          text: 'Retry', 
          onPress: () => handleDownload(formatType, quality) 
        }
      ]
    );
  } finally {
    setIsDownloading(false);
    setCurrentDownload(null);
    try {
      await PythonModule.removeProgressCallback();
    } catch (e) {
      console.error("Error removing callback:", e);
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
const parseYoutubeDuration = (duration) => {
  // Implement ISO 8601 duration parsing or use a library
  return 0; // Placeholder
};

const getFileSize = async (filepath) => {
  try {
    const stats = await RNFS.stat(filepath);
    return stats.size;
  } catch (e) {
    console.error("Could not get file size:", e);
    return 0;
  }
};


  const videoQualities = [
    { quality: '1920p', premium: true },
    { quality: '1280p', premium: false },
    { quality: '852p', premium: false },
    { quality: '640p', premium: false },
    { quality: '426p', premium: false },
    { quality: '256p', premium: false },
  ];

  const audioQualities = [
    { quality: '320kbps', premium: true },
    { quality: '256kbps', premium: false },
    { quality: '128kbps', premium: false },
    { quality: '64kbps', premium: false },
  ];

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return [
      hours ? `${hours}h ` : '',
      minutes ? `${minutes}m ` : '',
      seconds ? `${seconds}s` : '',
    ]
      .join('')
      .trim() || 'N/A';
  };

  const interpolateProgress = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>YouTube Downloader</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Loading video info...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
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
    <View style={styles.progressBar}>
      <Animated.View 
        style={[
          styles.progressFill, 
          { 
            width: interpolateProgress,
            backgroundColor: downloadProgress < 100 ? '#4caf50' : '#2196F3'
          }
        ]} 
      />
    </View>
    <Text style={styles.progressText}>
      {Math.round(downloadProgress)}% - {downloadProgress < 100 ? 'Downloading...' : 'Processing...'}
    </Text>
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
    backgroundColor: '#4285f4',
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
});

export default DownloadScreen;