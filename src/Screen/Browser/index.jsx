import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Browser = ({ route, navigation }) => {
  const webviewRef = useRef(null);
  const initialUrl = route.params?.url || 'https://m.youtube.com/';
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [canGoBack, setCanGoBack] = useState(false); // Track back navigation state

  useEffect(() => {
    if (route.params?.url) {
      setUrl(route.params.url);
      setInputUrl(route.params.url);
    }
  }, [route.params?.url]);

  const handleLoad = () => {
    const finalUrl = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;
    setUrl(finalUrl);
    setInputUrl(finalUrl); // Ensure inputUrl is updated
  };

  // Update inputUrl when WebView navigates to a new URL
  const handleNavigationStateChange = (navState) => {
    setInputUrl(navState.url); // Update TextInput with the current WebView URL
    setCanGoBack(navState.canGoBack); // Update back button state
    setUrl(navState.url); // Ensure url state is in sync
  };

  const goBack = () => {
    if (canGoBack) {
      webviewRef.current?.goBack();
    }
  };

  const goForward = () => {
    webviewRef.current?.goForward();
  };

  const reload = () => {
    webviewRef.current?.reload();
  };
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;

const isYouTubeUrl = (link) => {
const result = /youtu(be\.com\/(watch|shorts)|m\.youtube\.com\/shorts)/i.test(link);
return result;};

const handleDownload = () => {
  if (isYouTubeUrl(url)) {
    navigation.navigate('Download', { downloadedUrl: url });
  } else {
    alert('Only YouTube URLs can be downloaded.');
  }
};

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => {
          setUrl('https://m.youtube.com');
          setInputUrl('https://m.youtube.com');
        }}>
          <IonIcon name="home" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={goBack} disabled={!canGoBack}>
          <IonIcon
            name="chevron-back"
            size={24}
            color={canGoBack ? '#fff' : '#666'}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={goForward}>
          <IonIcon name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <IonIcon name="search" size={16} color="#ccc" style={{ marginRight: 6 }} />
          <TextInput
            value={inputUrl}
            onChangeText={setInputUrl}
            onSubmitEditing={handleLoad}
            placeholder="https://"
            placeholderTextColor="#ccc"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
          />
        </View>

        <TouchableOpacity onPress={reload}>
          <IonIcon name="reload" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity>
          <IonIcon name="bookmark-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webviewRef}
          source={{ uri: url }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadProgress={({ nativeEvent }) => {
            // Fallback to update inputUrl during loading
            if (nativeEvent.url !== inputUrl) {
              setInputUrl(nativeEvent.url);
              setUrl(nativeEvent.url);
            }
          }}
        />
        {isYouTubeUrl(url) &&
        <View style={{position:"absolute",bottom:80,left:30}}>
           <TouchableOpacity style={{backgroundColor:"#BB4F28",padding:20,borderRadius:20}}
           onPress={handleDownload}
           >
          <MaterialCommunityIcons name="download" size={24} color="white" />
        </TouchableOpacity>
        </View>
        }
        
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#1e1e1e',
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 10,
    borderRadius: 20,
    flex: 1,
    height: 36,
  },
  input: {
    color: '#fff',
    flex: 1,
    fontSize: 14,
  },
  webview: {
    flex: 1,
  },
});

export default Browser;