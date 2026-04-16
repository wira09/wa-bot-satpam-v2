/**
 * API YouTube MP3 Download (Sanka Vollerei)
 * Download YouTube videos as MP3 audio
 */
const axios = require("axios");

async function downloadYouTubeMP3(youtubeUrl) {
  try {
    const encodedUrl = encodeURIComponent(youtubeUrl);
    const url = `https://www.sankavollerei.com/download/ytmp3?apikey=planaai&url=${encodedUrl}`;
    const res = await axios.get(url, { timeout: 15000 });

    // YTMP3 API returns data in result field
    const result = res.data?.result;
    if (result && result.download) {
      return {
        title: result.title,
        duration: result.duration,
        download: result.download,
        thumbnail: result.thumbnail,
        quality: result.metadata?.media?.quality,
        fileSize: result.metadata?.media?.fileSize,
      };
    }

    return null;
  } catch (err) {
    throw new Error(`Gagal mendownload audio: ${err.message}`);
  }
}

module.exports = {
  downloadYouTubeMP3,
};
