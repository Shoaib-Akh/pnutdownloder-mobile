import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios'; // For making API requests

const DownloadScreen = ({ route }) => {
  const { downloadedUrl } = route.params || {};
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Your YouTube API key (replace with your actual API key)
  const API_KEY = 'AIzaSyCHmuOti2rUu2WYI9nCLM49JquzEORLir8';

  // Function to extract video ID from YouTube URL
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
      return fetchVideoData(retries - 1, delay * 2); // Exponential backoff
    }
    setError('Failed to fetch video data: ' + err.response?.data?.error?.message || err.message);
  } finally {
    setLoading(false);
  }
};

    fetchVideoData();
  }, [downloadedUrl]);

  return (
    <SafeAreaView style={styles.downloadContainer}>
      <Text style={styles.downloadTitle}>Download Screen</Text>
      {loading ? (
        <Text style={styles.downloadUrl}>Loading...</Text>
      ) : error ? (
        <Text style={[styles.downloadUrl, { color: 'red' }]}>{error}</Text>
      ) : videoData ? (
        <View>
          <Text style={styles.downloadUrl}>
            Video Title: {videoData.snippet.title}
          </Text>
          <Text style={styles.downloadUrl}>
            Channel: {videoData.snippet.channelTitle}
          </Text>
          <Text style={styles.downloadUrl}>
            Views: {videoData.statistics.viewCount}
          </Text>
          <Text style={styles.downloadUrl}>
            Duration: {videoData.contentDetails.duration}
          </Text>
          <Text style={styles.downloadUrl}>
            URL: {downloadedUrl || 'No URL provided'}
          </Text>
        </View>
      ) : (
        <Text style={styles.downloadUrl}>No video data available</Text>
      )}
    </SafeAreaView>
  );
};

export default DownloadScreen;

const styles = StyleSheet.create({
  downloadContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    alignItems: 'center',
  },
  downloadTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  downloadUrl: {
    fontSize: 16,
    color: '#333',
    marginVertical: 5,
  },
});