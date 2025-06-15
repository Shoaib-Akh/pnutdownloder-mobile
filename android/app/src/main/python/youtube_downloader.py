import yt_dlp
import os
import json
import tempfile
import time
import logging
from threading import Lock
from typing import Optional, Dict, Any, Callable

class YoutubeDownloader:
    def __init__(self):
        self.progress_callback = None
        self.cookies_path = None
        self.logs = []
        self.callback_lock = Lock()
        self._setup_logger()
        self._create_cookies_file()

    def _setup_logger(self):
        """Setup a logger for the downloader"""
        self.logger = logging.getLogger('YoutubeDownloader')
        self.logger.setLevel(logging.DEBUG)
        
        class MemoryLogHandler(logging.Handler):
            def __init__(self, log_store):
                super().__init__()
                self.log_store = log_store
            
            def emit(self, record):
                self.log_store.append(self.format(record))
        
        self.logs.clear()
        handler = MemoryLogHandler(self.logs)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        self.logger.addHandler(handler)

    def set_progress_callback(self, callback: Callable[[float], None]):
        """Set the progress callback function"""
        with self.callback_lock:
            self.progress_callback = callback

    def remove_progress_callback(self):
        """Remove the progress callback"""
        with self.callback_lock:
            self.progress_callback = None

    def _progress_hook(self, d: Dict[str, Any]):
        """Handle download progress and send updates"""
        if d.get('status') == 'downloading' and self.progress_callback:
            try:
                progress = float(d.get('_percent_str', '0%').strip('%'))
                with self.callback_lock:
                    if self.progress_callback:
                        self.progress_callback(progress)
                self._log(f"Download progress: {progress}%")
            except (ValueError, AttributeError) as e:
                self._log(f"Error processing progress update: {str(e)}")
                
    def _setup_logger(self):
        """Setup a logger for the downloader"""
        self.logger = logging.getLogger('YoutubeDownloader')
        self.logger.setLevel(logging.DEBUG)
        
        # Create a custom log handler that stores logs in memory
        class MemoryLogHandler(logging.Handler):
            def __init__(self, log_store):
                super().__init__()
                self.log_store = log_store
            
            def emit(self, record):
                self.log_store.append(self.format(record))
        
        self.logs.clear()
        handler = MemoryLogHandler(self.logs)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        self.logger.addHandler(handler)

    def _log(self, message):
        """Helper to log messages and store them"""
        self.logger.debug(message)
        return message

    def _create_cookies_file(self):
        """Create a secure temporary cookies file"""
        try:
            self.cookies_path = tempfile.mktemp(suffix='.txt')
            # Create empty file with Netscape format header
            with open(self.cookies_path, 'w') as f:
                f.write("# HTTP Cookie File\n")
                f.write("# Created for PNutDownloader\n")
            os.chmod(self.cookies_path, 0o600)  # Secure permissions
            self._log(f"Created temporary cookies file at {self.cookies_path}")
        except Exception as e:
            error_msg = f"Failed to create cookies file: {str(e)}"
            self._log(error_msg)
            raise RuntimeError(error_msg)

    def set_cookies(self, cookies: str) -> bool:
        """Improved cookie setting with better validation"""
        try:
            if not cookies or not isinstance(cookies, str):
                error_msg = "Invalid cookies: empty or not string"
                self._log(error_msg)
                return False

            # Basic format validation
            if '=' not in cookies:
                error_msg = "Invalid cookie format: missing key=value pairs"
                self._log(error_msg)
                return False

            # Prepare cookie entries
            cookie_entries = []
            expires = str(int(time.time() + 3600 * 24 * 7))  # 1 week expiry
            
            for cookie in cookies.split(';'):
                cookie = cookie.strip()
                if not cookie or '=' not in cookie:
                    continue
                
                name, value = cookie.split('=', 1)
                name = name.strip()
                value = value.split(';')[0].strip()
                
                if not name:
                    continue
                
                # Determine if cookie should be Secure
                is_secure = 'TRUE' if name.startswith('__Secure-') or name.startswith('__Host-') else 'FALSE'
                
                cookie_entries.append('\t'.join([
                    '.youtube.com',  # Domain
                    'TRUE',          # Include subdomains
                    '/',             # Path
                    is_secure,       # Secure flag
                    expires,         # Expiration
                    name,            # Name
                    value           # Value
                ]))

            if not cookie_entries:
                error_msg = "No valid cookies found in input"
                self._log(error_msg)
                return False

            # Write to file with validation
            with open(self.cookies_path, 'w') as f:
                f.write("# HTTP Cookie File\n")
                f.write("# Created for PNutDownloader\n")
                f.write("\n".join(cookie_entries))
                f.write("\n")  # End with newline

            # Verify file was written correctly
            if not os.path.exists(self.cookies_path):
                error_msg = "Failed to create cookies file"
                self._log(error_msg)
                return False

            success_msg = f"Successfully wrote {len(cookie_entries)} cookies to {self.cookies_path}"
            self._log(success_msg)
            return True

        except Exception as e:
            error_msg = f"Cookie processing failed: {str(e)}"
            self._log(error_msg)
            return False

    def get_video_info(self, url: str) -> Dict[str, Any]:
        """Get video info with cookie verification"""
        try:
            self._log(f"Getting video info for URL: {url}")
            
            # First verify cookies file
            if not self._verify_cookies_file():
                error_result = {'error': 'Invalid cookies file', 'details': 'File missing or corrupted'}
                self._log(f"Returning error: {error_result}")
                return error_result

            ydl_opts = {
                'quiet': False,  # Enable logging for debugging
                'verbose': True,
                'cookiefile': self.cookies_path,
                'ignoreerrors': False,
                'extract_flat': False,
                'logger': self.logger,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    error_result = {'error': 'No video info available', 'details': 'Extraction failed'}
                    self._log(f"Returning error: {error_result}")
                    return error_result
                
                if 'formats' not in info or not info.get('formats'):
                    # Try without cookies to see if that works
                    no_cookie_info = self._try_without_cookies(url)
                    if no_cookie_info and 'formats' in no_cookie_info:
                        result = {
                            'error': 'Cookies not working',
                            'details': 'Video available without cookies but not with them',
                            'suggestion': 'Check cookie validity',
                            'fallback_info': no_cookie_info
                        }
                        self._log(f"Returning cookies warning with fallback info: {result}")
                        return result
                    
                    error_result = {'error': 'No formats available', 'details': 'Video may be restricted'}
                    self._log(f"Returning error: {error_result}")
                    return error_result

                result = {
                    'title': info.get('title', ''),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'channel': info.get('uploader', ''),
                    'view_count': info.get('view_count', 0),
                    'formats': info.get('formats', [])
                }
                self._log(f"Successfully retrieved video info: {result}")
                return result

        except yt_dlp.utils.DownloadError as e:
            error_result = {'error': 'Download error', 'details': str(e)}
            self._log(f"Returning download error: {error_result}")
            return error_result
        except Exception as e:
            error_result = {'error': 'Unexpected error', 'details': str(e)}
            self._log(f"Returning unexpected error: {error_result}")
            return error_result

    def _verify_cookies_file(self) -> bool:
        """Verify the cookies file exists and is valid"""
        if not (self.cookies_path and os.path.exists(self.cookies_path)):
            self._log("Cookies file does not exist")
            return False
        
        try:
            with open(self.cookies_path, 'r') as f:
                content = f.read()
                if not content or 'youtube.com' not in content:
                    self._log("Cookies file appears invalid")
                    return False
            return True
        except Exception as e:
            self._log(f"Error verifying cookies file: {str(e)}")
            return False

    def _try_without_cookies(self, url: str) -> Optional[Dict[str, Any]]:
        """Try getting info without cookies for comparison"""
        try:
            self._log(f"Trying to get info without cookies for URL: {url}")
            ydl_opts = {
                'quiet': False,
                'verbose': True,
                'ignoreerrors': False,
                'logger': self.logger,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                self._log(f"Info without cookies: {'success' if info else 'failed'}")
                return info
        except Exception as e:
            self._log(f"Error getting info without cookies: {str(e)}")
            return None

    def download_video(self, url: str, format_type: str, quality: str, 
                      download_dir: Optional[str] = None) -> Dict[str, Any]:
        """Download video/audio"""
        try:
            self._log(f"Starting download for URL: {url}, format: {format_type}, quality: {quality}")
            
            download_dir = download_dir or os.path.join(os.path.expanduser('~'), 'PNutDownloader')
            os.makedirs(download_dir, exist_ok=True)
            self._log(f"Using download directory: {download_dir}")
                
            ydl_opts = {
                'outtmpl': os.path.join(download_dir, '%(title)s.%(ext)s'),
                'quiet': True,
                'progress_hooks': [self._progress_hook],
                'cookiefile': self.cookies_path,
                'ignoreerrors': True,
                'postprocessors': [],
                'merge_output_format': None,
                'logger': self.logger,
            }

            if format_type == 'video':
                ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]'
                self._log("Setting format to best MP4 video")
            elif format_type == 'audio':
                ydl_opts['format'] = 'bestaudio[ext=m4a]/bestaudio'
                ydl_opts['extractaudio'] = True
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
                self._log("Setting format to best audio (MP3)")
            else:
                error_result = {'error': 'Invalid format type'}
                self._log(f"Returning error: {error_result}")
                return error_result

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filepath = ydl.prepare_filename(info)
                
                result = {
                    'filepath': filepath,
                    'filename': os.path.basename(filepath),
                    'title': info.get('title', ''),
                    'logs': self.logs,
                }
                self._log(f"Download completed successfully: {result}")
                return result
        except Exception as e:
            error_result = {'error': str(e), 'logs': self.logs}
            self._log(f"Download failed: {error_result}")
            return error_result

    def _progress_hook(self, d: Dict[str, Any]):
        """Handle download progress"""
        if d.get('status') == 'downloading' and self.progress_callback:
            try:
                progress = float(d.get('_percent_str', '0%').strip('%'))
                self.progress_callback(progress)
                self._log(f"Download progress: {progress}%")
            except (ValueError, AttributeError) as e:
                self._log(f"Error processing progress update: {str(e)}")

# Bridge functions
def create_downloader():
    return YoutubeDownloader()

def set_cookies(downloader: YoutubeDownloader, cookies: str) -> bool:
    result = downloader.set_cookies(cookies)
    downloader._log(f"set_cookies result: {result}")
    return result

def get_video_info(downloader: YoutubeDownloader, url: str) -> str:
    result = downloader.get_video_info(url)
    downloader._log(f"get_video_info result: {result}")
    return json.dumps(result)

def download_video(downloader: YoutubeDownloader, url: str, format_type: str, 
                  quality: str, download_dir: Optional[str] = None) -> str:
    result = downloader.download_video(url, format_type, quality, download_dir)
    downloader._log(f"download_video result: {result}")
    return json.dumps(result)