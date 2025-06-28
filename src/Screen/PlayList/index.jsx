import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Linking, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatDuration } from '../../../utils/formatDuration';

const STORAGE_KEY = '@PNutDownloader/downloads';

const PlayList = () => {
  const [downloads, setDownloads] = useState([]);
  const [filteredDownloads, setFilteredDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'title'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [contentType, setContentType] = useState('all'); // 'all', 'video', 'audio'

  const fetchDownloads = async () => {
    try {
      const storedDownloads = await AsyncStorage.getItem(STORAGE_KEY);
      const parsedDownloads = storedDownloads ? JSON.parse(storedDownloads) : [];
      setDownloads(parsedDownloads);
      filterAndSortDownloads(parsedDownloads, contentType, sortBy, sortOrder);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortDownloads = (downloadsList, type, sortField, order) => {
    // Filter by content type
    let filtered = downloadsList;
    if (type !== 'all') {
      filtered = downloadsList.filter(item => 
        type === 'video' ? item.type === 'video' : item.type === 'audio'
      );
    }

    // Sort the results
    filtered = [...filtered].sort((a, b) => {
      if (sortField === 'date') {
        return order === 'asc' 
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      } else if (sortField === 'title') {
        return order === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      return 0;
    });

    setFilteredDownloads(filtered);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchDownloads();
    }, [])
  );

  useEffect(() => {
    filterAndSortDownloads(downloads, contentType, sortBy, sortOrder);
  }, [contentType, sortBy, sortOrder, downloads]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };



  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const toggleSortBy = () => {
    setSortBy(sortBy === 'date' ? 'title' : 'date');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading download history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Download History</Text>
      
      {/* Filter and Sort Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[styles.filterButton, contentType === 'all' && styles.activeFilter]}
            onPress={() => setContentType('all')}
          >
            <Text style={[styles.filterButtonText, contentType === 'all' && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, contentType === 'video' && styles.activeFilter]}
            onPress={() => setContentType('video')}
          >
            <Icon name="videocam" size={16} color={contentType === 'video' ? '#fff' : '#6200ee'} />
            <Text style={[styles.filterButtonText, contentType === 'video' && styles.activeFilterText]}> Videos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, contentType === 'audio' && styles.activeFilter]}
            onPress={() => setContentType('audio')}
          >
            <Icon name="audiotrack" size={16} color={contentType === 'audio' ? '#fff' : '#6200ee'} />
            <Text style={[styles.filterButtonText, contentType === 'audio' && styles.activeFilterText]}> Audio</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.sortButtons}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={toggleSortBy}
          >
            <Text style={styles.sortButtonText}>
              Sort by: {sortBy === 'date' ? 'Date' : 'Title'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sortOrderButton}
            onPress={toggleSortOrder}
          >
            <Icon 
              name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
              size={18} 
              color="#6200ee" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {filteredDownloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="download" size={48} color="#999" />
          <Text style={styles.emptyText}>No downloads found</Text>
          {contentType !== 'all' && (
            <Text style={styles.emptySubText}>Try changing the filter</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredDownloads}
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
                <View style={styles.downloadMeta}>
                  <View style={[styles.typeBadge, item.type === 'video' ? styles.videoBadge : styles.audioBadge]}>
                    <Icon 
                      name={item.type === 'video' ? 'videocam' : 'audiotrack'} 
                      size={12} 
                      color="#fff" 
                    />
                    <Text style={styles.typeBadgeText}>{item.type}</Text>
                  </View>
                  {item.quality && (
                    <Text style={styles.qualityText}>{item.quality}</Text>
                  )}
                  {item.duration && (
                    <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
                  )}
                </View>
                <View style={styles.channelInfo}>
                  <Icon name="person" size={12} color="#666" />
                  <Text style={styles.channelText}>{item.channel}</Text>
                </View>
                <Text style={styles.downloadDate}>{formatDate(item.date)}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
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
    marginBottom: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 18,
    color: '#666',
  },
  emptySubText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  activeFilter: {
    backgroundColor: '#6200ee',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6200ee',
  },
  activeFilterText: {
    color: '#fff',
  },
  sortButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortButtonText: {
    color: '#6200ee',
    fontSize: 14,
  },
  sortOrderButton: {
    padding: 6,
  },
  listContent: {
    paddingBottom: 16,
  },
  downloadItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbnail: {
    width: 80,
    height: 60,
    borderRadius: 6,
    marginRight: 16,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  downloadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  videoBadge: {
    backgroundColor: '#ff3d00',
  },
  audioBadge: {
    backgroundColor: '#009688',
  },
  typeBadgeText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  qualityText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  channelText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  downloadDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default PlayList;