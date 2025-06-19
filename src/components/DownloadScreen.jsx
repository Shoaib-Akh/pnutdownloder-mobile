import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const DownloadScreen = () => {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const startDownload = () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    
    // Simulate download progress (replace with actual download logic)
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const newProgress = prev + 0.05;
        if (newProgress >= 1) {
          clearInterval(interval);
          setIsDownloading(false);
          return 1;
        }
        return newProgress;
      });
    }, 300);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Downloads</Text>
      
      {/* Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` }]} />
      </View>
      
      {/* Percentage Text */}
      <Text style={styles.percentageText}>
        {Math.round(downloadProgress * 100)}%
      </Text>
      
      {/* Download Button */}
      <TouchableOpacity 
        style={styles.downloadButton} 
        onPress={startDownload}
        disabled={isDownloading}
      >
        <Text style={styles.buttonText}>
          {isDownloading ? 'Downloading...' : 'Start Download'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 10,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6200EE',
  },
  percentageText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 5,
  },
  downloadButton: {
    backgroundColor: '#6200EE',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DownloadScreen;