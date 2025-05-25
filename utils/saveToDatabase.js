const saveToDatabase = async (formatType, quality) => {
  if (!videoData) return;

  try {
    await addDoc(collection(db, 'downloads'), {
      videoId: videoData.id,
      title: videoData.snippet.title,
      channel: videoData.snippet.channelTitle,
      views: videoData.statistics.viewCount,
      duration: videoData.contentDetails.duration,
      format: formatType,
      quality: quality,
      downloadedUrl: downloadedUrl,
      createdAt: Timestamp.now(),
    });
    alert('Saved to database ✅');
  } catch (err) {
    console.error('Error saving to DB: ', err);
    alert('Failed to save to DB ❌');
  }
};
