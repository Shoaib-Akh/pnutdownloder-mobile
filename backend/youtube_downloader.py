from flask import Flask, request, jsonify, send_file, Response
import yt_dlp
import os
import shutil
import logging
import uuid
import requests
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
DOWNLOAD_DIR = "downloads"
API_KEY = os.getenv('YOUTUBE_API_KEY')

if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_video_id(url):
    import re
    regex = r'(?:youtube\.com\/(?:.*[?&]v=|(?:v|embed|shorts|kids|music)\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
    match = re.search(regex, url)
    return match.group(1) if match else None

@app.route('/video-info', methods=['POST'])
def get_video_info():
    try:
        data = request.get_json()
        url = data.get('url')
        video_id = extract_video_id(url)
        if not video_id:
            return jsonify({'error': 'Invalid YouTube URL'}), 400

        response = requests.get(
            'https://www.googleapis.com/youtube/v3/videos',
            params={
                'part': 'snippet,contentDetails,statistics',
                'id': video_id,
                'key': API_KEY,
            }
        )
        return jsonify(response.json()), 200
    except Exception as e:
        logger.error(f"Error fetching video info: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/download', methods=['POST'])
def download_video():
    try:
        data = request.get_json()
        url = data.get('url')
        format_type = data.get('format_type')
        quality = data.get('quality')

        if not url or not format_type or not quality:
            return jsonify({'error': 'Missing required parameters'}), 400

        ydl_opts = {
            'outtmpl': f'{DOWNLOAD_DIR}/%(title)s_{uuid.uuid4().hex}.%(ext)s',
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
        }

        if format_type == 'video':
            quality_map = {
                '1920p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '1280p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '852p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '640p': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '426p': 'bestvideo[height<=240][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '256p': 'bestvideo[height<=144][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            }
            ydl_opts['format'] = quality_map.get(quality, 'best')
            ydl_opts['merge_output_format'] = 'mp4'
        elif format_type == 'audio':
            ydl_opts['format'] = 'bestaudio'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': quality.replace('kbps', ''),
            }]
            ydl_opts['merge_output_format'] = 'mp3'
        else:
            return jsonify({'error': 'Invalid format type'}), 400

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            downloaded_file = ydl.prepare_filename(info)
            if format_type == 'audio':
                downloaded_file = downloaded_file.replace('.m4a', '.mp3').replace('.webm', '.mp3')

        if not os.path.exists(downloaded_file):
            return jsonify({'error': 'Download failed'}), 500

        # Send the file and clean up afterward
        try:
            response = send_file(
                downloaded_file,
                as_attachment=True,
                download_name=os.path.basename(downloaded_file),
                mimetype='video/mp4' if format_type == 'video' else 'audio/mp3'
            )
            # Delete the file after sending
            os.remove(downloaded_file)
            logger.info(f"Deleted temporary file: {downloaded_file}")
            return response
        except Exception as e:
            logger.error(f"Error sending file: {e}")
            os.remove(downloaded_file)  # Clean up even on error
            return jsonify({'error': 'Failed to send file'}), 500
    except Exception as e:
        logger.error(f"Error during download: {e}")
        return jsonify({'error': str(e)}), 500
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)