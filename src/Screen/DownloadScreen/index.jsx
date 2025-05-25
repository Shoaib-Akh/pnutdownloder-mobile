import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
const DownloadScreen = ({ route }) => {
//   const saveToDatabase = async (formatType, quality) => {
//   if (!videoData) return;

//   try {
//     await addDoc(collection(db, 'downloads'), {
//       videoId: videoData.id,
//       title: videoData.snippet.title,
//       channel: videoData.snippet.channelTitle,
//       views: videoData.statistics.viewCount,
//       duration: videoData.contentDetails.duration,
//       format: formatType,
//       quality: quality,
//       downloadedUrl: downloadedUrl,
//       createdAt: Timestamp.now(),
//     });
//     alert('Saved to database ✅');
//   } catch (err) {
//     console.error('Error saving to DB: ', err);
//     alert('Failed to save to DB ❌');
//   }
// };

  const { downloadedUrl } = route.params || {};
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_KEY = 'AIzaSyCHmuOti2rUu2WYI9nCLM49JquzEORLir8';

  const extractVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:.*[?&]v=|(?:v|embed|shorts|kids|music)\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  useEffect(() => {
    const fetchVideoData = async (retries = 3, delay = 1000) => {
      const videoId = extractVideoId(downloadedUrl);
      if (!videoId) {
        setError('Invalid or missing YouTube URL');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos`,
          {
            params: {
              id: videoId,
              key: API_KEY,
              part: 'snippet,contentDetails,statistics',
            },
          }
        );

        if (response.data.items.length > 0) {
          setVideoData(response.data.items[0]);
        } else {
          setError('No video found for the provided URL');
        }
      } catch (err) {
        if (retries > 0 && err.response?.status === 403) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchVideoData(retries - 1, delay * 2);
        }
        setError('Failed to fetch video data: ' + (err.response?.data?.error?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [downloadedUrl]);

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

  return (
    <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Download Screen</Text>

        {loading ? (
          <Text style={styles.infoText}>Loading...</Text>
        ) : error ? (
          <Text style={[styles.infoText, { color: 'red' }]}>{error}</Text>
        ) : videoData ? (
          <View style={styles.card}>
            <Image
              source={{ uri: videoData.snippet.thumbnails.medium.url }}
              style={styles.thumbnail}
            />
            <View>
              <Text style={styles.infoText}>🎥 Title: {videoData.snippet.title}</Text>
              <Text style={styles.infoText}>📺 Channel: {videoData.snippet.channelTitle}</Text>
              <Text style={styles.infoText}>👁️ Views: {videoData.statistics.viewCount}</Text>
              <Text style={styles.infoText}>⏱️ Duration: {videoData.contentDetails.duration}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.infoText}>No video data available</Text>
        )}
      <ScrollView>

        {/* Video Quality Section */}
        <Text style={styles.sectionTitle}>🎬 Video Quality</Text>
        {videoQualities.map((item, index) => (
          <View key={`video-${index}`} style={styles.qualityRow}>
            <Text style={styles.qualityText}>{item.quality}</Text>
            <TouchableOpacity
              // onPress={() => saveToDatabase('video', item.quality)}

              style={[styles.button, item.premium ? styles.premium : styles.download]}
            >
              <Text style={styles.buttonText}>
                {item.premium ? '⚡ Premium' : 'Download'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Audio Quality Section */}
        <Text style={styles.sectionTitle}>🎧 Audio Quality</Text>
        {audioQualities.map((item, index) => (
          <View key={`audio-${index}`} style={styles.qualityRow}>
            <Text style={styles.qualityText}>{item.quality}</Text>
            <TouchableOpacity
              // onPress={() => saveToDatabase('audio', item.quality)}

              style={[styles.button, item.premium ? styles.premium : styles.download]}
            >
              <Text style={styles.buttonText}>
                {item.premium ? '⚡ Premium' : 'Download'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DownloadScreen;

const styles = StyleSheet.create({
  container: {
    flex: 2,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    color: '#b184f0',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#2c2a3a',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  thumbnail: {
    width: '100%',
    objectFit:"contain",
    height: 80,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoText: {
    color: '#ccc',
    fontSize: 15,
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#BB4F28',
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 15,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2c2a3a',
    padding: 15,
    borderRadius: 10,
    marginVertical: 6,
    alignItems: 'center',
  },
  qualityText: {
    color: '#aaa',
    fontSize: 16,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  premium: {
    backgroundColor: '#9d59f1',
  },
  download: {
    backgroundColor: '#BB4F28',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
