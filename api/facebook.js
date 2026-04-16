/**
 * API Facebook Video Downloader (Sanka Vollerei)
 */
const axios = require("axios");

const API_KEY = "planaai";
const BASE_URL = "https://www.sankavollerei.com/download/facebook";

async function downloadFacebook(url) {
  try {
    if (!url || typeof url !== "string") {
      return { error: "❌ URL Facebook tidak valid." };
    }

    // Call API
    const res = await axios.get(BASE_URL, {
      params: {
        apikey: API_KEY,
        url: url,
      },
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const data = res.data;

    // Validasi response
    if (!data.status || !data.result) {
      return {
        error:
          "❌ Gagal mengekstrak video Facebook. URL mungkin invalid atau video tidak tersedia.",
      };
    }

    const result = data.result;

    // Ambil video quality terbaik (720p HD jika tersedia)
    const videos = result.video || [];
    let videoUrl = null;
    let quality = "Default";

    if (videos.length > 0) {
      // Prioritas: 720p > 640p > 1080p > others
      const hd = videos.find((v) => v.quality?.includes("720p"));
      const sd = videos.find((v) => v.quality?.includes("640p"));
      const full = videos.find((v) => v.quality?.includes("1080p"));

      if (hd) {
        videoUrl = hd.url;
        quality = hd.quality || "720p (HD)";
      } else if (sd) {
        videoUrl = sd.url;
        quality = sd.quality || "640p";
      } else if (full) {
        videoUrl = full.url;
        quality = full.quality || "1080p";
      } else {
        videoUrl = videos[0].url;
        quality = videos[0].quality || "Unknown";
      }
    } else {
      // Fallback ke media jika tidak ada video array
      videoUrl = result.media;
      if (!videoUrl) {
        return { error: "❌ Tidak ada video atau media yang ditemukan." };
      }
    }

    if (!videoUrl) {
      return { error: "❌ Link video tidak dapat diakses." };
    }

    return {
      title: result.title || "Facebook Video",
      duration: result.duration || "Unknown",
      thumbnail: result.thumbnail || null,
      videoUrl: videoUrl,
      quality: quality,
      music: result.music || null,
    };
  } catch (err) {
    console.error("[Facebook] Error:", err.message);
    if (err.response?.status === 404) {
      return {
        error: "❌ Video Facebook tidak ditemukan. Pastikan link valid.",
      };
    }
    if (err.code === "ECONNABORTED") {
      return { error: "❌ Timeout saat mengakses server. Coba lagi nanti." };
    }
    return { error: `❌ Gagal download Facebook: ${err.message}` };
  }
}

module.exports = {
  downloadFacebook,
};
