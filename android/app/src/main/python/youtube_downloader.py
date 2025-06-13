import yt_dlp
import os
import json
import tempfile
import time
from typing import Optional, Dict, Any

class YoutubeDownloader:
    def __init__(self):
        self.progress_callback = None
        self.cookies_path = None
        self._create_cookies_file()

    def _create_cookies_file(self):
        """Create a secure temporary cookies file"""
        try:
            self.cookies_path = tempfile.mktemp(suffix='.txt')
            # Create empty file with Netscape format header
            with open(self.cookies_path, 'w') as f:
                f.write("# HTTP Cookie File\n")
                f.write("# Created for PNutDownloader\n")
            os.chmod(self.cookies_path, 0o600)  # Secure permissions
        except Exception as e:
            raise RuntimeError(f"Failed to create cookies file: {str(e)}")

    def set_cookies(self, cookies: str) -> bool:
        """Improved cookie setting with better validation"""
        try:
            if not cookies or not isinstance(cookies, str):
                print("Invalid cookies: empty or not string")
                return False

            # Basic format validation
            if '=' not in cookies:
                print("Invalid cookie format: missing key=value pairs")
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
                print("No valid cookies found in input")
                return False

            # Write to file with validation
            with open(self.cookies_path, 'w') as f:
                f.write("# HTTP Cookie File\n")
                f.write("# Created for PNutDownloader\n")
                f.write("\n".join(cookie_entries))
                f.write("\n")  # End with newline

            # Verify file was written correctly
            if not os.path.exists(self.cookies_path):
                print("Failed to create cookies file")
                return False

            print(f"Successfully wrote {len(cookie_entries)} cookies to {self.cookies_path}")
            return True

        except Exception as e:
            print(f"Cookie processing failed: {str(e)}")
            return False

    def get_video_info(self, url: str) -> Dict[str, Any]:
        """Get video info with cookie verification"""
        try:
            # First verify cookies file
            if not self._verify_cookies_file():
                return {'error': 'Invalid cookies file', 'details': 'File missing or corrupted'}

            ydl_opts = {
                'quiet': False,  # Enable logging for debugging
                'verbose': True,
                'cookiefile': self.cookies_path,
                'ignoreerrors': False,
                'extract_flat': False,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    return {'error': 'No video info available', 'details': 'Extraction failed'}
                
                if 'formats' not in info or not info.get('formats'):
                    # Try without cookies to see if that works
                    no_cookie_info = self._try_without_cookies(url)
                    if no_cookie_info and 'formats' in no_cookie_info:
                        return {
                            'error': 'Cookies not working',
                            'details': 'Video available without cookies but not with them',
                            'suggestion': 'Check cookie validity',
                            'fallback_info': no_cookie_info
                        }
                    return {'error': 'No formats available', 'details': 'Video may be restricted'}

                return {
                    'title': info.get('title', ''),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'channel': info.get('uploader', ''),
                    'view_count': info.get('view_count', 0),
                    'formats': info.get('formats', [])
                }

        except yt_dlp.utils.DownloadError as e:
            return {'error': 'Download error', 'details': str(e)}
        except Exception as e:
            return {'error': 'Unexpected error', 'details': str(e)}

    def _verify_cookies_file(self) -> bool:
        """Verify the cookies file exists and is valid"""
        if not (self.cookies_path and os.path.exists(self.cookies_path)):
            print("Cookies file does not exist")
            return False
        
        try:
            with open(self.cookies_path, 'r') as f:
                content = f.read()
                if not content or 'youtube.com' not in content:
                    print("Cookies file appears invalid")
                    return False
            return True
        except Exception:
            return False

    def _try_without_cookies(self, url: str) -> Optional[Dict[str, Any]]:
        """Try getting info without cookies for comparison"""
        try:
            ydl_opts = {
                'quiet': False,
                'verbose': True,
                'ignoreerrors': False,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)
        except Exception:
            return None

    def download_video(self, url: str, format_type: str, quality: str, 
                      download_dir: Optional[str] = None) -> Dict[str, Any]:
        """Download video/audio"""
        try:
            download_dir = download_dir or os.path.join(os.path.expanduser('~'), 'PNutDownloader')
            os.makedirs(download_dir, exist_ok=True)
                
            ydl_opts = {
                'outtmpl': os.path.join(download_dir, '%(title)s.%(ext)s'),
                'quiet': True,
                'progress_hooks': [self._progress_hook],
                'cookiefile': self.cookies_path,
                'ignoreerrors': True,
                'postprocessors': [],
                'merge_output_format': None,
            }

            if format_type == 'video':
                ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]'
            elif format_type == 'audio':
                ydl_opts['format'] = 'bestaudio[ext=m4a]/bestaudio'
                ydl_opts['extractaudio'] = True
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
            else:
                return {'error': 'Invalid format type'}

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filepath = ydl.prepare_filename(info)
                
                return {
                    'filepath': filepath,
                    'filename': os.path.basename(filepath),
                    'title': info.get('title', '')
                }
        except Exception as e:
            return {'error': str(e)}

    def _progress_hook(self, d: Dict[str, Any]):
        """Handle download progress"""
        if d.get('status') == 'downloading' and self.progress_callback:
            try:
                progress = float(d.get('_percent_str', '0%').strip('%'))
                self.progress_callback(progress)
            except (ValueError, AttributeError):
                pass

# Bridge functions
def create_downloader():
    return YoutubeDownloader()

def set_cookies(downloader: YoutubeDownloader, cookies: str) -> bool:
    return downloader.set_cookies(cookies)

def get_video_info(downloader: YoutubeDownloader, url: str) -> str:
    return json.dumps(downloader.get_video_info(url))

def download_video(downloader: YoutubeDownloader, url: str, format_type: str, 
                  quality: str, download_dir: Optional[str] = None) -> str:
    return json.dumps(downloader.download_video(url, format_type, quality, download_dir))