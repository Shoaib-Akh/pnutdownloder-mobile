import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet, StatusBar, Alert, Linking } from 'react-native';
import { NavigationContainer, DefaultTheme as NavigationTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import images from './utils/images';
import HomeScreen from './src/Screen/Home';
import Browser from './src/Screen/Browser';
import Playlist from './src/Screen/PlayList';
import DownloadScreen from './src/Screen/DownloadScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Theme Configuration
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

const GITHUB_RELEASES_URL = "https://api.github.com/repos/Shoaib-Akh/pnutdownloder-mobile/releases/latest";
const GITHUB_VERSION_URL = "https://raw.githubusercontent.com/Shoaib-Akh/pnutdownloder-mobile/main/version.json";
const APP_VERSION = "1.0.01";

const checkVersion = async () => {
  const fallbackResponse = {
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    needsUpdate: false,
    downloadUrl: null,
    changelog: 'Version check failed'
  };

  try {
    // First try GitHub Releases API
    console.log('Checking GitHub Releases...');
    const apiResponse = await fetch(GITHUB_RELEASES_URL);
    
    if (apiResponse.ok) {
      try {
        const releaseData = await apiResponse.json();
        console.log('Release data:', releaseData);
        
        const apkAsset = releaseData.assets?.find(asset => 
          asset.name?.endsWith('.apk')
        );
        
        return {
          currentVersion: APP_VERSION,
          latestVersion: releaseData.tag_name.replace(/^v/, ''),
          needsUpdate: releaseData.tag_name.replace(/^v/, '') > APP_VERSION,
          downloadUrl: apkAsset?.browser_download_url || null,
          changelog: releaseData.body || 'New version available'
        };
      } catch (e) {
        console.warn('Failed to parse GitHub API response:', e);
      }
    }

    // Fallback to version.json
    console.log('Falling back to version.json...');
    const versionResponse = await fetch(GITHUB_VERSION_URL);
    
    if (versionResponse.ok) {
      try {
        const versionData = await versionResponse.json();
        return {
          currentVersion: APP_VERSION,
          latestVersion: versionData.version,
          needsUpdate: versionData.version > APP_VERSION,
          downloadUrl: versionData.downloadUrl || null,
          changelog: versionData.changelog || 'Update available'
        };
      } catch (e) {
        console.warn('Failed to parse version.json:', e);
      }
    }
  } catch (error) {
    console.error('Version check error:', error);
  }

  return fallbackResponse;
};

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Image
        source={images.logo}
        style={styles.logo}
        accessibilityLabel="App Logo"
        resizeMode="contain"
      />
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

function MainTabs() {
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

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: AppTheme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: styles.tabBar,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Download" component={DownloadScreen} />
      <Tab.Screen name="Browser" component={Browser} />
      <Tab.Screen name="Playlist" component={Playlist} />
    </Tab.Navigator>
  );
}

function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [versionInfo, setVersionInfo] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      const versionData = await checkVersion();
      setVersionInfo(versionData);

      if (versionData.needsUpdate) {
        Alert.alert(
          `Update Available (v${versionData.latestVersion})`,
          versionData.changelog,
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Download Update', 
              onPress: () => {
                if (versionData.downloadUrl) {
                  Linking.openURL(versionData.downloadUrl);
                } else {
                  Linking.openURL("https://github.com/Shoaib-Akh/pnutdownloder-mobile/releases");
                }
              }
            }
          ]
        );
      }

      setTimeout(() => setIsSplashVisible(false), 2000);
    };

    initializeApp();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer theme={AppTheme}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" hidden={false} />
          {isSplashVisible ? <SplashScreen /> : <MainTabs />}
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
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
});

export default App;