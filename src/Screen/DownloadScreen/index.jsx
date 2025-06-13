import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
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
const DownloadScreen = ({ route }) => {
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


// const handleDownload = async (formatType, quality) => {
//   if (isDownloading) {
//     console.log('Download already in progress');
//     Alert.alert('Info', 'A download is already in progress.');
//     return;
//   }

//   // Step 1: Check permissions
//   console.log('Checking storage permissions...');
//   const hasPermission = await requestStoragePermission();
//   if (!hasPermission) {
//     console.log('Permission denied, aborting download');
//     Alert.alert('Permission Denied', 'Storage permission is required to save files. Please enable it in Settings.', [
//       { text: 'Open Settings', onPress: () => openSettings() },
//       { text: 'Cancel', style: 'cancel' },
//     ]);
//     return;
//   }
//   console.log('Storage permissions granted');

//   setIsDownloading(true);
//   setCurrentDownload({ formatType, quality });
//   setDownloadProgress(0);
//   progressAnim.setValue(0);

//   try {
//     // Step 2: Set up folder and file path
//     const folderName = 'PNutDownloader';
//     const folderPath = Platform.OS === 'android'
//       ? `${RNFS.DownloadDirectoryPath}/${folderName}`
//       : `${RNFS.DocumentDirectoryPath}/${folderName}`;
//     console.log('Target folder path:', folderPath);

//     // Create folder if it doesn't exist
//     const folderExists = await RNFS.exists(folderPath);
//     console.log('Folder exists:', folderExists);
//     if (!folderExists) {
//       console.log('Creating folder:', folderPath);
//       await RNFS.mkdir(folderPath).catch(err => {
//         console.error('Folder creation error:', err);
//         throw new Error('Failed to create folder');
//       });
//       console.log('Folder created successfully');
//     }

//     // Generate safe file name
//     const sanitizeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
//     const fileExtension = formatType === 'video' ? 'mp4' : 'mp3';
//     const fileName = `${sanitizeFileName(videoData?.snippet?.title || 'video')}_${Date.now()}.${fileExtension}`;
//     const filePath = `${folderPath}/${fileName}`;
//     console.log('Target file path:', filePath);

//     // Step 3: Download file using axios POST
//     const BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://192.168.1.4:5001';
//     const downloadUrl = `${BACKEND_URL}/download`;
//     console.log('Sending POST request to:', downloadUrl);
//     console.log('Request body:', { url: downloadedUrl, format_type: formatType, quality });

//     const response = await axios.post(
//       downloadUrl,
//       { url: downloadedUrl, format_type: formatType, quality },
//       {
//         responseType: 'arraybuffer',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         onDownloadProgress: (progressEvent) => {
//           if (progressEvent.total) {
//             const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
//             console.log('Download progress:', progress, '%');
//             setDownloadProgress(progress);
//             Animated.timing(progressAnim, {
//               toValue: progress / 100,
//               duration: 200,
//               useNativeDriver: false,
//             }).start();
//           }
//         },
//       }
//     );

//     console.log('Response status:', response.status);
//     console.log('Response data length:', response.data.length);
//     if (response.status !== 200) {
//       throw new Error(`Download failed with status ${response.status}`);
//     }
//     if (!response.data || response.data.length === 0) {
//       throw new Error('Received empty response data');
//     }

//     // Step 4: Write file to storage
//     console.log('Writing file to:', filePath);
//     const base64Data = base64.encodeFromByteArray(new Uint8Array(response.data));
//     await RNFS.writeFile(filePath, base64Data, 'base64').catch(err => {
//       console.error('File write error:', err);
//       throw new Error('Failed to write file');
//     });
//     console.log('File written successfully');

//     // Step 5: Verify file exists
//     const fileExists = await RNFS.exists(filePath);
//     console.log('File exists after download:', fileExists);
//     if (!fileExists) {
//       throw new Error('File was not saved to the specified path');
//     }

//     // Step 6: Register file in media store (Android)
//     if (Platform.OS === 'android') {
//       console.log('Scanning file for media store:', filePath);
//       await RNFS.scanFile(filePath).catch(err => {
//         console.error('Media scan error:', err);
//         Alert.alert('Warning', 'File saved but may not appear in gallery/downloads.');
//       });
//       console.log('File scanned successfully');
//     }

//     // Step 7: Notify user
//     const saveLocation = Platform.OS === 'android' ? `Downloads/${folderName}/${fileName}` : `${folderName}/${fileName}`;
//     console.log('File saved to:', saveLocation);
//     Alert.alert('Download Complete', `File saved to: ${saveLocation}`, [
//       { text: 'OK' },
//       Platform.OS === 'ios' && {
//         text: 'Open',
//         onPress: () => Linking.openURL(`file://${filePath}`).catch(err => console.error('Failed to open file:', err)),
//       },
//     ]);
//   } catch (err) {
//     console.error('Download error:', err.message, err.stack);
//     Alert.alert('Error', `Failed to save file: ${err.message}. Please check your network or try again.`);
//   } finally {
//     console.log('Download process complete, resetting state');
//     setIsDownloading(false);
//     setCurrentDownload(null);
//   }
// };
  // Helper function to convert blob to base64
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
    const downloadDir = `${RNFS.ExternalDirectoryPath}/PNutDownloader`;
    if (!await RNFS.exists(downloadDir)) {
      await RNFS.mkdir(downloadDir);
    }

    const result = await PythonModule.downloadVideo(
      downloadedUrl, 
      formatType, 
      quality,
      downloadDir
    );
    
    const data = JSON.parse(result);
    console.log("datadatadata",data);
    
   

    if (Platform.OS === 'android') {
      await RNFS.scanFile(data.filepath);
    }

    Alert.alert(
      'Download Complete',
      `${data.title} saved successfully!`,
      [
        { text: 'OK' },
        {
          text: 'Open File',
          onPress: () => Linking.openURL(`file://${data.filepath}`)
        }
      ]
    );
  } catch (err) {
    console.log("Download error:", err);
    
    let errorMessage = 'Download failed';
    if (err.message.includes('requested format not available')) {
      errorMessage = 'The requested format is not available for direct download';
    } else if (err.message) {
      errorMessage = err.message;
    }

    Alert.alert('Error', errorMessage);
  } finally {
    setIsDownloading(false);
    setCurrentDownload(null);
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
              <Animated.View style={[styles.progressFill, { width: interpolateProgress }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(downloadProgress)}%</Text>
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