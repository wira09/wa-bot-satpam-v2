/**
 * API Twitter/X Downloader (siputzx)
 * Download media from Twitter/X posts
 */
const axios = require("axios");

async function downloadTwitterMedia(twitterUrl) {
  try {
    const encodedUrl = encodeURIComponent(twitterUrl);
    const url = `https://api.siputzx.my.id/api/d/twitter?url=${encodedUrl}`;
    const res = await axios.get(url, { timeout: 15000 });

    // Twitter API returns data in data field
    const data = res.data?.data;
    if (data && data.downloadLink) {
      return {
        imgUrl: data.imgUrl,
        downloadLink: data.downloadLink,
        videoTitle: data.videoTitle,
        videoDescription: data.videoDescription,
      };
    }

    return null;
  } catch (err) {
    throw new Error(`Gagal mendownload media Twitter: ${err.message}`);
  }
}

module.exports = {
  downloadTwitterMedia,
};
