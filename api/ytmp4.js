/**
 * API YouTube MP4 Download (Sanka Vollerei)
 * Download YouTube videos in MP4 format
 */
const axios = require("axios");

async function downloadYouTubeMP4(youtubeUrl) {
  try {
    const encodedUrl = encodeURIComponent(youtubeUrl);
    const url = `https://www.sankavollerei.com/download/ytmp4?apikey=planaai&url=${encodedUrl}`;
    const res = await axios.get(url, { timeout: 15000 });

    // YTMP4 API returns data in result field
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
    throw new Error(`Gagal mendownload video: ${err.message}`);
  }
}

module.exports = {
  downloadYouTubeMP4,
};
