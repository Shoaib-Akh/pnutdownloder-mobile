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
                
                # Extract available formats with height information
                formats = []
                for fmt in info.get('formats', []):
                    if fmt.get('height'):
                        formats.append({
                            'height': fmt['height'],
                            'ext': fmt.get('ext', ''),
                            'format_note': fmt.get('format_note', ''),
                            'url': fmt.get('url', '')
                        })
                
                return {
                    'title': info.get('title', ''),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'channel': info.get('uploader', ''),
                    'view_count': info.get('view_count', 0),
                    'formats': formats
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
                return {
                    'filepath': filepath,
                    'filename': os.path.basename(filepath),
                    'title': info.get('title', '')
                }
        except Exception as e:
            return {'error': str(e)}

    def _get_video_format(self, quality):
        """Return video format based on height (quality)"""
        quality_map = {
            '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
            '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
            '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
            '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
            '240p': 'bestvideo[height<=240]+bestaudio/best[height<=240]',
            '144p': 'bestvideo[height<=144]+bestaudio/best[height<=144]',
        }
        return quality_map.get(quality, 'bestvideo+bestaudio/best')

    def _get_audio_format(self, quality):
        """Return audio format without FFmpeg (no conversion)"""
        return {
            'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]'
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


# 🔧 Helper functions for React Native via Chaquopy

def get_video_info(url):
    downloader = YoutubeDownloader()
    result = downloader.get_video_info(url)
    return json.dumps(result)

def download_video(url, format_type, quality, download_dir=None):
    downloader = YoutubeDownloader()
    result = downloader.download_video(url, format_type, quality, download_dir)
    return json.dumps(result)