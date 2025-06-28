import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, StatusBar, Alert, Linking, Platform, NativeModules } from 'react-native';
import { NavigationContainer, DefaultTheme as NavigationTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import semver from 'semver';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import images from './utils/images';
import HomeScreen from './src/Screen/Home';
import Browser from './src/Screen/Browser';
import Playlist from './src/Screen/PlayList';
import DownloadScreen from './src/Screen/DownloadScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Get version from package.json
const packageJson = require('./package.json');
const APP_VERSION = packageJson.version;
const VERSION_STORAGE_KEY = '@app_version_info';

const AppTheme = {
  ...NavigationTheme,
  colors: {
    ...NavigationTheme.colors,
    primary: '#6200EE',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#333333',
    border: '#E0E0E0',
  },
};
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/Shoaib-Akh/pnutdownloder-mobile/releases/latest';

const checkVersion = async () => {
  const fallbackResponse = {
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    needsUpdate: false,
    downloadUrl: null,
    changelog: 'Version check failed',
  };

  try {
    // Check if we have a stored version from a previous update
    const storedVersion = await AsyncStorage.getItem(VERSION_STORAGE_KEY);
    if (storedVersion) {
      const parsed = JSON.parse(storedVersion);
      if (semver.gt(parsed.latestVersion, APP_VERSION)) {
        // If stored version is newer, use that as our current version
        return {
          ...parsed,
          currentVersion: parsed.latestVersion,
          needsUpdate: false
        };
      }
    }

    const apiResponse = await fetch(GITHUB_RELEASES_URL);
    console.log('apiResponse status:', apiResponse);

    if (apiResponse.ok) {
      const releaseData = await apiResponse.json();
      console.log('Release data:', releaseData);

      const apkAsset = releaseData.assets?.find(asset =>
        asset.name?.endsWith('.apk')
      );

      const latestVersion = releaseData.tag_name?.replace(/^v/, '') || APP_VERSION;

      const versionInfo = {
        currentVersion: APP_VERSION,
        latestVersion,
        needsUpdate: semver.gt(latestVersion, APP_VERSION),
        downloadUrl: apkAsset?.browser_download_url || null,
        changelog: releaseData.body || 'New version available',
      };

      // Store the version info
      await AsyncStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versionInfo));
      
      return versionInfo;
    }
  } catch (error) {
    console.error('Version check error:', error);
  }

  return fallbackResponse;
};

const installApk = async (apkPath) => {
  try {
    if (Platform.OS === 'android') {
      // For Android 8+ we need to use the FileProvider approach
      if (Platform.Version >= 33) {
        // Using NativeModules to handle the installation
        if (NativeModules.InstallApk) {
          NativeModules.InstallApk.install(apkPath);
        } else {
          // Fallback for devices without InstallApk module
          await Linking.openURL(`file://${apkPath}`);
        }
      } else {
        // For older Android versions
        await Linking.openURL(`file://${apkPath}`);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Installation failed:', error);
    throw error;
  }
};

function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [versionInfo, setVersionInfo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [displayVersion, setDisplayVersion] = useState(APP_VERSION);

  const downloadAndInstallUpdate = async (downloadUrl, version) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      
      const downloadDir = `${RNFS.DocumentDirectoryPath}/updates`;
      const dirExists = await RNFS.exists(downloadDir);
      if (!dirExists) {
        await RNFS.mkdir(downloadDir);
      }

      const apkPath = `${downloadDir}/update_v${version}.apk`;
      const downloadOptions = {
        fromUrl: downloadUrl,
        toFile: apkPath,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          console.log(`Download progress: ${progress.toFixed(0)}%`);
          setDownloadProgress(progress);
        },
      };

      const download = RNFS.downloadFile(downloadOptions);
      const result = await download.promise;

      if (result.statusCode === 200) {
        console.log('Download complete, installing...');
        
        // Update stored version before installation
        const newVersionInfo = {
          currentVersion: version,
          latestVersion: version,
          needsUpdate: false,
          downloadUrl: null,
          changelog: 'Successfully updated'
        };
        await AsyncStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(newVersionInfo));
        setDisplayVersion(version);
        
        await installApk(apkPath);
        return true;
      } else {
        throw new Error(`Download failed with status ${result.statusCode}`);
      }
    } catch (error) {
      console.error('Update failed:', error);
      throw error;
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const checkStoredVersion = async () => {
      const storedVersion = await AsyncStorage.getItem(VERSION_STORAGE_KEY);
      if (storedVersion) {
        const parsed = JSON.parse(storedVersion);
        setDisplayVersion(parsed.currentVersion);
      }
    };
    
    checkStoredVersion();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      const versionData = await checkVersion();
      setVersionInfo(versionData);

      if (versionData.needsUpdate && versionData.downloadUrl) {
        try {
          await downloadAndInstallUpdate(
            versionData.downloadUrl, 
            versionData.latestVersion
          );
        } catch (error) {
          console.log('Automatic update failed, continuing to app...');
          setTimeout(() => setIsSplashVisible(false), 2000);
        }
      } else {
        setTimeout(() => setIsSplashVisible(false), 2000);
      }
    };

    initializeApp();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer theme={AppTheme}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" hidden={false} />
          {isSplashVisible ? (
            <SplashScreen 
              downloadProgress={downloadProgress} 
              isDownloading={isDownloading}
              version={displayVersion}
            />
          ) : (
            <MainTabs version={displayVersion} />
          )}
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function SplashScreen({ downloadProgress, isDownloading, version }) {
  return (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Image
        source={images.logo}
        style={styles.logo}
        accessibilityLabel="App Logo"
        resizeMode="contain"
      />
      <Text style={styles.versionText}>Version: {version}</Text>
      
      {isDownloading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Downloading update: {downloadProgress.toFixed(0)}%
          </Text>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill,
                { width: `${downloadProgress}%` }
              ]} 
            />
          </View>
        </View>
      )}
    </View>
  );
}

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const Tab = createBottomTabNavigator();

function MainTabs({ version }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Download') {
            iconName = focused ? 'download' : 'download-outline';
          } else if (route.name === 'Browser') {
            iconName = focused ? 'globe' : 'globe-outline';
          } else if (route.name === 'Playlist') {
            iconName = focused ? 'musical-notes' : 'musical-notes-outline';
          } else {
            iconName = 'circle';
          }

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
              accessibilityLabel={`${route.name} tab icon`}
            />
          );
        },
        tabBarActiveTintColor: AppTheme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: styles.tabBar,
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          tabBarLabel: 'Home',
          headerTitle: `App v${version}` 
        }} 
      />
      <Tab.Screen name="Download" component={DownloadScreen} />
      <Tab.Screen name="Browser" component={Browser} />
      <Tab.Screen name="Playlist" component={Playlist} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 16,
    color: '#6200EE',
    marginBottom: 10,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 18,
    color: '#D32F2F',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  progressContainer: {
    width: '80%',
    marginTop: 20,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#6200EE',
    marginBottom: 5,
  },
  progressBarBackground: {
    height: 10,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6200EE',
    borderRadius: 5,
  },
});

export default App;