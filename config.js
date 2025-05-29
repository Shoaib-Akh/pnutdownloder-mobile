// src/config.js
const Config = {
  // Your backend API base URL
  BACKEND_URL: 'http://192.168.1.4:5001', // Replace with your actual backend URL
  
  // YouTube API configuration (if you're using it directly from frontend)
  YOUTUBE_API_KEY: 'your_youtube_api_key', // Only if using directly from frontend
  
  // App settings
  MAX_DOWNLOAD_QUALITY: '1920p',
  
  // Timeouts
  API_TIMEOUT: 30000, // 30 seconds
  
  // Feature flags
  ENABLE_PREMIUM_FEATURES: false,
};

export default Config;