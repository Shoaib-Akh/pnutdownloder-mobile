import yt_dlp
import os
import json

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
        """Download a video or audio from YouTube"""
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
            }

            if format_type == 'video':
                ydl_opts['format'] = self._get_video_format(quality)
            elif format_type == 'audio':
                ydl_opts.update(self._get_audio_format(quality))
            else:
                return {'error': 'Invalid format type'}

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filepath = ydl.prepare_filename(info)
                
                if format_type == 'audio':
                    filepath = filepath.replace('.m4a', '.mp3').replace('.webm', '.mp3')
                
                return {
                    'filepath': filepath,
                    'filename': os.path.basename(filepath),
                    'title': info.get('title', '')
                }
        except Exception as e:
            return {'error': str(e)}

    def _get_video_format(self, quality):
        """Return the appropriate video format string based on quality"""
        quality_map = {
            '1920p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '1280p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '852p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '640p': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '426p': 'bestvideo[height<=240][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '256p': 'bestvideo[height<=144][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        }
        return quality_map.get(quality, 'best')

    def _get_audio_format(self, quality):
        """Return audio format options"""
        return {
            'format': 'bestaudio',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': quality.replace('kbps', ''),
            }]
        }

    def _progress_hook(self, d):
        """Handle download progress updates"""
        if d['status'] == 'downloading' and self.progress_callback:
            progress = d.get('_percent_str', '0%').strip('%')
            try:
                progress_float = float(progress)
                self.progress_callback(progress_float)
            except ValueError:
                pass


# Helper functions for React Native integration
def get_video_info(url):
    downloader = YoutubeDownloader()
    result = downloader.get_video_info(url)
    return json.dumps(result)

def download_video(url, format_type, quality, download_dir=None):
    downloader = YoutubeDownloader()
    result = downloader.download_video(url, format_type, quality, download_dir)
    return json.dumps(result)