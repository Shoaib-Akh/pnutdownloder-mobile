
import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme as NavigationTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import images from './utils/images';
import HomeScreen from './src/Screen/Home';
import Browser from './src/Screen/Browser';
import Playlist from './src/Screen/PlayList';
import DownloadScreen from './src/Screen/DownloadScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { checkAppVersion } from './utils/versionCheck';
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
const APP_VERSION = "1.0.1"; // Must match your app's version
const GITHUB_VERSION_URL = "https://raw.githubusercontent.com/Shoaib-Akh/pnutdownloder-mobile/main/version.json";
const GITHUB_RELEASES_URL = "https://api.github.com/repos/Shoaib-Akh/pnutdownloder-mobile/releases/latest";
const checkVersion = async () => {
  let versionData = {
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    needsUpdate: false,
    downloadUrl: null,
    changelog: 'Version check failed'
  };

  try {
    // Attempt GitHub API
    const apiResponse = await fetch(GITHUB_RELEASES_URL);
    console.log("apiResponse",apiResponse);
    
    if (apiResponse.ok) {
      const text = await apiResponse.text();
      console.log("text",text);
      
      try {
        const data = JSON.parse(text);
        versionData = {
          ...versionData,
          latestVersion: data.tag_name.replace(/^v/, ''),
          needsUpdate: data.tag_name.replace(/^v/, '') > APP_VERSION,
          downloadUrl: data.assets[0]?.browser_download_url,
          changelog: data.body || 'New version available'
        };
        return versionData;
      } catch (e) {
        console.warn('GitHub API JSON parse failed:', e);
      }
    }

    // Fallback to version.json
    const versionResponse = await fetch(GITHUB_VERSION_URL);
    if (versionResponse.ok) {
      const text = await versionResponse.text();
      try {
        const data = JSON.parse(text);
        versionData = {
          ...versionData,
          latestVersion: data.version,
          needsUpdate: data.version > APP_VERSION,
          downloadUrl: data.downloadUrl,
          changelog: data.changelog
        };
      } catch (e) {
        console.warn('version.json parse failed:', e);
      }
    }
  } catch (error) {
    console.error('Version check error:', error);
  }

  return versionData;
};
// Splash Screen Component
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

// Tab Content Components






// Error Boundary Component
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

// Bottom Tabs Navigator
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

     if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Download" component={DownloadScreen} />
      <Tab.Screen name="Browser" component={Browser} />
      <Tab.Screen name="Playlist" component={Playlist} />


    </Tab.Navigator>
  );
}

// Main App Component
function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
const [versionInfo, setVersionInfo] = useState(null);
console.log("versionInfo",versionInfo);

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
  loadingText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 16,
  },
  tabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
  },
  tabHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  tabDescription: {
    fontSize: 16,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
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
