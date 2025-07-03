import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';

const HomeScreen = ({ navigation }) => {
  const [url, setUrl] = useState('');
const packageJson = require('../../../package.json');
const APP_VERSION = packageJson.version;
  const platforms = {
    youtube: {
      icon: 'logo-youtube',
      color: '#FF0000',
      url: 'https://www.youtube.com',
    },
  };

  const isYouTubeUrl = (link) => {
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /youtu\.be\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/live\/([a-zA-Z0-9_-]+)/
    ];
    return patterns.some(pattern => pattern.test(link));
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        if (isYouTubeUrl(clipboardContent)) {
          setUrl(clipboardContent);
          navigation.navigate('Download', { downloadedUrl: clipboardContent });
        } else {
          Alert.alert('Invalid URL', 'Please paste a valid YouTube URL');
        }
      } else {
        Alert.alert('Clipboard is empty', 'There is nothing to paste');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to paste from clipboard');
    }
  };

  const handleSearch = () => {
    if (url.trim()) {
      if (isYouTubeUrl(url)) {
        navigation.navigate('Download', { downloadedUrl: url });
      } else {
        Alert.alert('Invalid URL', 'Please enter a valid YouTube URL');
      }
    } else {
      Alert.alert('Empty Field', 'Please enter a URL');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{width:40}}>
          <Text>
          {/* <Icon name="menu" size={30} color="#BB4F28" /> */}

          </Text>
        </View>
        <Text style={styles.title}>PNUT Downloader</Text>
       <View style={styles.versionContainer}>
          <Text style={styles.versionText}>V{APP_VERSION}</Text>
        </View> 
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Paste YouTube video URL here"
            placeholderTextColor="#999"
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Icon name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.orText}>OR</Text>

        <TouchableOpacity style={styles.pasteBtn} onPress={handlePaste}>
          <Icon name="link-outline" size={20} color="#fff" />
          <Text style={styles.pasteText}>Tap to paste YouTube link</Text>
        </TouchableOpacity>

        <View style={styles.platformBox}>
          <Text style={styles.sectionTitle}>Supported Platforms</Text>
          <Text style={styles.sectionSubtitle}>
            Download from all platforms – HD quality requires Premium
          </Text>

          <View style={styles.platforms}>
            {Object.entries(platforms).map(([platform, data]) => (
              <TouchableOpacity
                key={platform}
                onPress={() => navigation.navigate('Browser', { url: data.url })}
              >
                <Icon
                  name={data.icon}
                  size={30}
                  color="#fff"
                  style={[styles.platformIcon, { backgroundColor: data.color }]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    backgroundColor: '#fff',
    padding: 26,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: '#fff',
  },
  title: {
    color: '#BB4F28',
    fontSize: 24,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center'
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    color: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchBtn: {
    marginLeft: 10,
    backgroundColor: '#BB4F28',
    borderRadius: 10,
    padding: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    width: 45,
  },
  orText: {
    color: '#aaa',
    textAlign: 'center',
    marginVertical: 12
  },
  pasteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#BB4F28',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  pasteText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  platformBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    color: '#BB4F28',
    fontSize: 18,
    fontWeight: 'bold'
  },
  sectionSubtitle: {
    color: '#666',
    marginTop: 6,
    fontSize: 12,
  },
  platforms: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16
  },
  platformIcon: {
    padding: 10,
    borderRadius: 10,
  },
   versionContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  versionText: {
    color: '#BB4F28',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HomeScreen;