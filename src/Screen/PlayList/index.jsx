import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STORAGE_KEY = '@PNutDownloader/downloads';

const PlayList = () => {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDownloads = async () => {
    try {
      const storedDownloads = await AsyncStorage.getItem(STORAGE_KEY);
      setDownloads(storedDownloads ? JSON.parse(storedDownloads) : []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchDownloads();
    }, [])
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading download history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Download History</Text>
      
      {downloads.length === 0 ? (
        <Text style={styles.emptyText}>No downloads yet</Text>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.downloadItem}
              onPress={() => Linking.openURL(`file://${item.filepath}`)}
            >
              {item.thumbnail && (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
              )}
              <View style={styles.downloadInfo}>
                <Text style={styles.downloadTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.downloadDetails}>
                  {item.type} • {item.quality} 
                </Text>
                <Text style={styles.downloadDetails}>
                  {item.channel} • {formatDate(item.date)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  downloadItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbnail: {
    width: 80,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  downloadDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});

export default PlayList;