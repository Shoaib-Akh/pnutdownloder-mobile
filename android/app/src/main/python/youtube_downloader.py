import yt_dlp
import os
import json
import tempfile
import time
import logging
import isodate
import stat
import subprocess

import googleapiclient.discovery
import googleapiclient.errors
from threading import Lock
from typing import Optional, Dict, Any, Callable


class YoutubeDownloader:
    def __init__(self):
        self.progress_callback = None
        self.cookies_path = None
        self.ffmpeg_path = None
        self.logs = []
        self.callback_lock = Lock()
        self._setup_logger()
        self._create_cookies_file()
         
    def _setup_logger(self):
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

    def set_ffmpeg_path(self, path: str) -> bool:
        """Set the path to the FFmpeg binary and verify it's executable."""
        try:
            if not path or not os.path.exists(path):
                self._log(f"FFmpeg path does not exist: {path}")
                return False
                
            # Verify the file is executable
            mode = os.stat(path).st_mode
            if not (mode & stat.S_IXUSR):
                self._log("FFmpeg is not executable, setting permissions...")
                os.chmod(path, 0o755)  # rwxr-xr-x
                
            self.ffmpeg_path = path
            self._log(f"FFmpeg path set to: {path}")
            return True
        except Exception as e:
            self._log(f"Error setting FFmpeg path: {str(e)}")
            return False

    def _get_ffmpeg_path(self) -> Optional[str]:
        """Get the verified FFmpeg path if available."""
        if self.ffmpeg_path and os.path.exists(self.ffmpeg_path):
            try:
                if os.access(self.ffmpeg_path, os.X_OK):
                    return self.ffmpeg_path
                self._log("FFmpeg exists but is not executable")
            except Exception as e:
                self._log(f"Error checking FFmpeg permissions: {str(e)}")
        return None

    def _log(self, message):
        self.logger.debug(message)
        return message

    def set_progress_callback(self, callback: Callable[[float], None]):
        with self.callback_lock:
            self.progress_callback = callback

    def remove_progress_callback(self):
        with self.callback_lock:
            self.progress_callback = None

    def _progress_hook(self, d: Dict[str, Any]):
        if d.get('status') == 'downloading' and self.progress_callback:
            try:
                progress = float(d.get('_percent_str', '0%').strip('%'))
                with self.callback_lock:
                    if self.progress_callback:
                        self.progress_callback(progress)
                self._log(f"Download progress: {progress}%")
            except (ValueError, AttributeError) as e:
                self._log(f"Error processing progress update: {str(e)}")

    def _create_cookies_file(self):
        try:
            self.cookies_path = tempfile.mktemp(suffix='.txt')
            with open(self.cookies_path, 'w') as f:
                f.write("# HTTP Cookie File\n")
                f.write("# Created for PNutDownloader\n")
            os.chmod(self.cookies_path, 0o600)
            self._log(f"Created temporary cookies file at {self.cookies_path}")
        except Exception as e:
            error_msg = f"Failed to create cookies file: {str(e)}"
            self._log(error_msg)
            raise RuntimeError(error_msg)

    def set_cookies(self, cookies: str) -> bool:
        try:
            if not cookies or not isinstance(cookies, str):
                self._log("Invalid cookies: empty or not string")
                return False

            if '=' not in cookies:
                self._log("Invalid cookie format: missing key=value pairs")
                return False

            cookie_entries = []
            expires = str(int(time.time() + 3600 * 24 * 7))

            for cookie in cookies.split(';'):
                cookie = cookie.strip()
                if not cookie or '=' not in cookie:
                    continue

                name, value = cookie.split('=', 1)
                name = name.strip()
                value = value.split(';')[0].strip()

                if not name:
                    continue

                is_secure = 'TRUE' if name.startswith('__Secure-') or name.startswith('__Host-') else 'FALSE'

                cookie_entries.append('\t'.join([
                    '.youtube.com', 'TRUE', '/', is_secure, expires, name, value
                ]))

            if not cookie_entries:
                self._log("No valid cookies found in input")
                return False

            with open(self.cookies_path, 'w') as f:
                f.write("# HTTP Cookie File\n")
                f.write("# Created for PNutDownloader\n")
                f.write("\n".join(cookie_entries))
                f.write("\n")

            if not os.path.exists(self.cookies_path):
                self._log("Failed to create cookies file")
                return False

            self._log(f"Successfully wrote {len(cookie_entries)} cookies to {self.cookies_path}")
            return True

        except Exception as e:
            self._log(f"Cookie processing failed: {str(e)}")
            return False

    def get_video_info(self, url: str) -> Dict[str, Any]:
        try:
            self._log(f"Getting video info for URL: {url}")

            video_id = self._extract_video_id(url)
            if not video_id:
                result = {'error': 'Invalid YouTube URL', 'details': 'Could not extract video ID'}
                self._log(f"Returning error: {result}")
                return result

            youtube = googleapiclient.discovery.build(
                "youtube", "v3",
                developerKey="AIzaSyCHmuOti2rUu2WYI9nCLM49JquzEORLir8"
            )

            request = youtube.videos().list(
                part="snippet,contentDetails,statistics",
                id=video_id
            )
            response = request.execute()

            if not response.get('items'):
                result = {'error': 'Video not found', 'details': 'No items in API response'}
                self._log(f"Returning error: {result}")
                return result

            item = response['items'][0]
            snippet = item['snippet']
            stats = item['statistics']
            content_details = item['contentDetails']

            duration = self._parse_duration(content_details['duration'])

            result = {
                'title': snippet.get('title', ''),
                'duration': duration,
                'thumbnail': snippet.get('thumbnails', {}).get('high', {}).get('url', ''),
                'channel': snippet.get('channelTitle', ''),
                'view_count': int(stats.get('viewCount', 0)),
                'formats': []
            }

            self._log(f"Successfully retrieved video info: {result}")
            return result

        except googleapiclient.errors.HttpError as e:
            result = {'error': 'YouTube API error', 'details': str(e)}
            self._log(f"Returning API error: {result}")
            return result
        except Exception as e:
            result = {'error': 'Unexpected error', 'details': str(e)}
            self._log(f"Returning unexpected error: {result}")
            return result

    def _extract_video_id(self, url: str) -> Optional[str]:
        try:
            if "v=" in url:
                return url.split("v=")[-1].split("&")[0]
            elif "youtu.be/" in url:
                return url.split("youtu.be/")[-1].split("?")[0]
            elif "/embed/" in url:
                return url.split("/embed/")[-1].split("?")[0]
            elif "/shorts/" in url:
                return url.split("/shorts/")[-1].split("?")[0]
            else:
                self._log(f"Unsupported YouTube URL format: {url}")
                return None
        except Exception as e:
            self._log(f"Error extracting video ID from URL: {str(e)}")
            return None

    def _parse_duration(self, iso_duration: str) -> int:
        try:
            duration = isodate.parse_duration(iso_duration)
            return int(duration.total_seconds())
        except Exception as e:
            self._log(f"Error parsing duration: {str(e)}")
            return 0

    def _verify_cookies_file(self) -> bool:
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

  

    def download_video(self, url: str, format_type: str, quality: str, download_dir: Optional[str] = None) -> Dict[str, Any]:
        try:
            ffmpeg_path = self._get_ffmpeg_path()
            self._log(f"FFmpeg available: {ffmpeg_path is not None}")

            download_dir = download_dir or os.path.join(os.path.expanduser('~'), 'PNutDownloader')
            os.makedirs(download_dir, exist_ok=True)

            ydl_opts = {
                'outtmpl': os.path.join(download_dir, '%(title)s.%(ext)s'),
                'quiet': True,
                'progress_hooks': [self._progress_hook],
                'cookiefile': self.cookies_path,
                'logger': self.logger,
                'noplaylist': True,
                'restrictfilenames': True,
                'retries': 3,
                'ignoreerrors': True,

            }

            # Handle different formats
            if format_type == 'video':
                    ydl_opts.update({
                        'format': f'bestvideo[height<={quality.replace("p", "")}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                        'merge_output_format': 'mp4',
                        'ffmpeg_location': ffmpeg_path,
                    })
             
                    
            elif format_type == 'audio':
                    ydl_opts.update({
                        'format': 'bestaudio/best',
                        'postprocessors': [{
                            'key': 'FFmpegExtractAudio',
                            'preferredcodec': 'mp3',
                            'preferredquality': quality.replace('k', ''),
                        }],
                        'ffmpeg_location': ffmpeg_path,
                    })
               

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                if not info:
                    raise Exception("Failed to extract video info")

                filepath = ydl.prepare_filename(info)
                if not os.path.exists(filepath):
                    base_path = os.path.splitext(filepath)[0]
                    for ext in ['.mp4', '.mkv', '.webm', '.m4a', '.mp3']:
                        if os.path.exists(base_path + ext):
                            filepath = base_path + ext
                            break

                # if not os.path.exists(filepath):
                #     raise Exception("Downloaded file not found")

                # try:
                    # size = os.path.getsize(filepath)
                # except Exception as e:
                    # self._log(f"Could not get file size: {str(e)}")
                    # size = 0

                result = {
                    # 'filepath': filepath,
                    # 'filename': os.path.basename(filepath),
                    'title': info.get('title', ''),
                    # 'size': size,
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'logs': self.logs[-100:],
                }
            if not hasattr(self, 'downloaded_videos'):
                self.downloaded_videos = []
            self.downloaded_videos.append(result)
            
            return result
        except Exception as e:
            self._log(f"Download failed: {str(e)}")
            return {'error': str(e), 'logs': self.logs[-100:]}
    def test_ffmpeg(self) -> str:
        try:
            if not self.ffmpeg_path:
                return "FFmpeg path not set"
            
            output = subprocess.check_output([self.ffmpeg_path, "-version"], stderr=subprocess.STDOUT)
            return output.decode('utf-8', errors='replace')
        except subprocess.CalledProcessError as e:
            self._log(f"FFmpeg test failed with return code {e.returncode}: {e.output.decode('utf-8', errors='replace')}")
            return f"Error: {e.output.decode('utf-8', errors='replace')}"
        except Exception as e:
            self._log(f"FFmpeg test failed: {str(e)}")
            return f"Error: {str(e)}"


# Bridge functions
def create_downloader():
    return YoutubeDownloader()

def set_ffmpeg_path(downloader: YoutubeDownloader, path: str) -> bool:
    result = downloader.set_ffmpeg_path(path)
    downloader._log(f"set_ffmpeg_path result: {result}")
    return result

def set_progress_callback(downloader: YoutubeDownloader, callback: Callable[[float], None]):
    downloader.set_progress_callback(callback)
    downloader._log("Progress callback set")

def remove_progress_callback(downloader: YoutubeDownloader):
    downloader.remove_progress_callback()
    downloader._log("Progress callback removed")

def set_cookies(downloader: YoutubeDownloader, cookies: str) -> bool:
    result = downloader.set_cookies(cookies)
    downloader._log(f"set_cookies result: {result}")
    return result

def get_video_info(downloader: YoutubeDownloader, url: str) -> str:
    result = downloader.get_video_info(url)
    downloader._log(f"get_video_info result: {result}")
    return json.dumps(result)

def download_video(downloader: YoutubeDownloader, url: str, format_type: str, quality: str, download_dir: Optional[str] = None) -> str:
    result = downloader.download_video(url, format_type, quality, download_dir)
    downloader._log(f"download_video result: {result}")
    return json.dumps(result)

def test_ffmpeg(downloader: YoutubeDownloader) -> str:
    result = downloader.test_ffmpeg()
    downloader._log(f"test_ffmpeg result: {result}")
    return result