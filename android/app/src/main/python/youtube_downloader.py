import yt_dlp
import os
import json
import sys

class YoutubeDownloader:
    def __init__(self):
        self.progress_callback = None

    def set_progress_callback(self, callback):
        self.progress_callback = callback

    def get_video_info(self, url):
        """Get metadata about a YouTube video"""
        try:
            ydl_opts = {'quiet': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return {
                    'title': info.get('title', ''),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'channel': info.get('uploader', ''),
                    'view_count': info.get('view_count', 0),
                    'formats': info.get('formats', [])
                }
        except Exception as e:
            return {'error': str(e)}

    def download_video(self, url, format_type, quality, download_dir=None):
        """Download a video or audio from YouTube without Android-specific dependencies"""
        try:
            # Set default download directory
            if download_dir is None:
                download_dir = os.path.join(os.path.expanduser('~'), 'PNutDownloader')
            
            if not os.path.exists(download_dir):
                os.makedirs(download_dir)
                
            ydl_opts = {
                'outtmpl': os.path.join(download_dir, f'%(title)s.%(ext)s'),
                'quiet': True,
                'progress_hooks': [self._progress_hook],
                # Disable all post-processing that requires FFmpeg
                'postprocessors': [],
                'merge_output_format': None,
            }

            if format_type == 'video':
                # Only select formats that are already in mp4 container
                ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]'
            elif format_type == 'audio':
                # Select audio-only formats that don't need conversion
                ydl_opts['format'] = 'bestaudio[ext=m4a]/bestaudio'
                ydl_opts['extractaudio'] = True
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

    def _progress_hook(self, d):
        """Handle download progress updates"""
        if d['status'] == 'downloading' and self.progress_callback:
            progress = d.get('_percent_str', '0%').strip('%')
            try:
                progress_float = float(progress)
                self.progress_callback(progress_float)
            except ValueError:
                pass

# Bridge functions
def get_video_info(url):
    downloader = YoutubeDownloader()
    return json.dumps(downloader.get_video_info(url))

def download_video(url, format_type, quality, download_dir=None):
    downloader = YoutubeDownloader()
    return json.dumps(downloader.download_video(url, format_type, quality, download_dir))