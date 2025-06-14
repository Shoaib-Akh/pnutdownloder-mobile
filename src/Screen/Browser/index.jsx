import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ToastAndroid,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from 'react-native-fs';
import CookieManager from '@react-native-cookies/cookies';

const Browser = ({ route, navigation }) => {
  const webviewRef = useRef(null);
  const initialUrl = route.params?.url || 'https://m.youtube.com/';
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [cookies, setCookies] = useState('');
  const [isYouTube, setIsYouTube] = useState(true);

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

  const handleNavigationStateChange = (navState) => {
    const newUrl = navState.url || url;
    setInputUrl(newUrl);
    setCanGoBack(navState.canGoBack);
    setUrl(newUrl);
    setIsYouTube(isYouTubeUrl(newUrl));

    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        (function() {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'cookies',
              data: document.cookie
            }));
          } catch(e) {
            console.error('Cookie error:', e.message);
          }
        })();
        true;
      `);
    }
  };

  const onMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'cookies') {
        setCookies(message.data);
      }
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  };

  




  const saveAllCookiesToFile = async () => {
  try {
    const nativeCookies = await CookieManager.get(url); // or hardcode 'https://youtube.com'
    console.log("nativeCookies",nativeCookies);

  await NativeModules.PythonModule.setCookies(cookies);

    const formattedCookies = Object.entries(nativeCookies).map(([name, obj]) => {
      return [
        obj.domain || '.youtube.com',
        obj.hostOnly ? 'FALSE' : 'TRUE',
        obj.path || '/',
        obj.secure ? 'TRUE' : 'FALSE',
        obj.expires ? Math.floor(new Date(obj.expires).getTime() / 1000) : Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        name,
        obj.value
      ].join('\t');
    }).join('\n');

    const downloadsPath = `${RNFS.DownloadDirectoryPath}/youtube_all_cookies.txt`;
    await RNFS.writeFile(downloadsPath, formattedCookies, 'utf8');
    showMessage(`All cookies saved!`);
  } catch (error) {
    console.error(error);
    showMessage('Error saving all cookies');
  }
};
  const showMessage = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert(message);
    }
  };

  const goBack = () => webviewRef.current?.goBack();
  const goForward = () => webviewRef.current?.goForward();
  const reload = () => webviewRef.current?.reload();

const isYouTubeUrl = (link) => {
const result = /youtu(be\.com\/(watch|shorts)|m\.youtube\.com\/shorts)/i.test(link);
return result;};

  const handleDownload = async () => {
  if (!isYouTubeUrl(url)) {
    showMessage('Only YouTube URLs can be downloaded');
    return;
  }

  try {
    // First save the cookies
    await saveAllCookiesToFile();
    
    // Then navigate to the Download screen
    navigation.navigate('Download', { downloadedUrl: url });
  } catch (error) {
    console.error('Error in handleDownload:', error);
    showMessage('Error preparing download');
  }
};


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => {
          const homeUrl = 'https://m.youtube.com';
          setUrl(homeUrl);
          setInputUrl(homeUrl);
          setIsYouTube(true);
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
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          ref={webviewRef}
          source={{ uri: url }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={onMessage}
          injectedJavaScript={`
            (function() {
              function sendCookies() {
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'cookies',
                    data: document.cookie
                  }));
                } catch(e) {
                  console.error('Cookie error:', e.message);
                }
              }
              sendCookies();
              setInterval(sendCookies, 3000);
              true;
            })();
          `}
        />
        
        {isYouTube && (
          <View style={styles.floatingButtons}>
            <TouchableOpacity
              style={[styles.floatingButton, { backgroundColor: "#FF0000" }]}
              onPress={handleDownload}
            >
              <MaterialCommunityIcons name="download" size={24} color="white" />
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={[styles.floatingButton, { backgroundColor: "#4CAF50" }]}
              onPress={saveAllCookiesToFile}
            >
              <MaterialCommunityIcons name="cookie" size={24} color="white" />
            </TouchableOpacity> */}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
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
  floatingButtons: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 15,
  },
  floatingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});

export default Browser;