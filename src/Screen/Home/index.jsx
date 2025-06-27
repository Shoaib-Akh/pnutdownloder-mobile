import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

const HomeScreen = ({navigation}) => {
  const [url, setUrl] = useState('');
  
  const platforms = {
    youtube: {
      icon: 'logo-youtube',
      color: '#FF0000',
      url: 'https://www.youtube.com',
    },
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        setUrl(clipboardContent);
        // Navigate to DownloadScreen with the pasted URL
        navigation.navigate('Download', { downloadedUrl: clipboardContent });
      } else {
        alert('Clipboard is empty');
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      alert('Failed to paste from clipboard');
    }
  };

  const handleSearch = () => {
    if (url.trim()) {
      navigation.navigate('Download', { downloadedUrl: url });
    } else {
      alert('Please enter a URL');
    }
  };

  return (
    <SafeAreaView>
      <View style={styles.header}>
        <Icon name="menu" size={30} color="#BB4F28" />
        <Text style={styles.title}>VidCombo</Text>
        <TouchableOpacity style={styles.upgradeBtn}>
          <Text style={styles.upgradeText}>Upgrade ✨</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.container}>
        {/* Input Field */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Paste video URL here"
            placeholderTextColor="#999"
            style={styles.input}
            value={url}
            onChangeText={setUrl}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Icon name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.orText}>OR</Text>

        <TouchableOpacity style={styles.pasteBtn} onPress={handlePaste}>
          <Icon name="link-outline" size={20} color="#fff" />
          <Text style={styles.pasteText}>Tap to paste link</Text>
        </TouchableOpacity>

        {/* Supported Platforms */}
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
  container: {  backgroundColor: '#ffff', padding: 26 ,},
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',paddingHorizontal:26 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  upgradeBtn: { backgroundColor: '#BB4F28', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  upgradeText: { color: '#fff', fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#222', color: '#fff', borderRadius: 10, paddingHorizontal: 15, height: 45 },
  searchBtn: { marginLeft: 10, backgroundColor: '#BB4F28', borderRadius: 10, padding: 10 },
  orText: { color: '#aaa', textAlign: 'center', marginVertical: 12 },
  pasteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#BB4F28',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  pasteText: { color: '#fff', marginLeft: 8 },
  platformBox: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, marginTop: 20 },
  sectionTitle: { color: '#BB4F28', fontSize: 18, fontWeight: 'bold' },
  sectionSubtitle: { color: '#ccc', marginTop: 6 },
  platforms: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  platformIcon: { backgroundColor: '#BB4F28', padding: 10, borderRadius: 10 },
  premiumBox: { backgroundColor: '#5a189a', marginTop: 20, borderRadius: 10, padding: 12 },
  premiumTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  premiumText: { color: '#ddd', marginTop: 4 },
  premiumBtn: {
    marginTop: 10,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  premiumBtnText: { color: '#5a189a', fontWeight: 'bold' },
});

export default HomeScreen;
