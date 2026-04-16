/**
 * API Instagram Video/Reels Downloader (Siputzx)
 * Support: Reels, Video Posts
 */
const axios = require("axios");

const BASE_URL = "https://api.siputzx.my.id/api/d/igram";

async function downloadInstagramVideo(url) {
  try {
    if (!url || typeof url !== "string") {
      return { error: "❌ URL Instagram tidak valid." };
    }

    // Call API
    const res = await axios.get(BASE_URL, {
      params: {
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
    if (!data.status || !data.data) {
      return {
        error:
          "❌ Gagal mengekstrak video Instagram. URL mungkin invalid atau konten tidak tersedia.",
      };
    }

    const result = data.data;

    // Cek video URLs
    const videoList = result.url || [];
    if (!videoList || videoList.length === 0) {
      return { error: "❌ Tidak ada video yang ditemukan di URL ini." };
    }

    // Ambil video pertama (biasanya yang terbaik)
    const videoItem = videoList[0];
    if (!videoItem || !videoItem.url) {
      return { error: "❌ Link video tidak dapat diakses." };
    }

    // Extract metadata dari hasil
    const meta = result.meta || {};
    let caption = (meta.title && meta.title.trim()) || "Instagram Video";

    // Batasi caption terlalu panjang
    if (caption.length > 300) {
      caption = caption.substring(0, 297) + "...";
    }

    return {
      caption: caption,
      author: (meta.username && meta.username.trim()) || null,
      videoUrl: videoItem.url,
      thumbnail: result.thumb || null,
      likes: meta.like_count || 0,
      comments: meta.comment_count || 0,
      mediaType: "video",
    };
  } catch (err) {
    console.error("[Instagram Video] Error:", err.message);
    if (err.response?.status === 404) {
      return {
        error:
          "❌ Video Instagram tidak ditemukan. Pastikan link valid dan akun tidak private.",
      };
    }
    if (err.code === "ECONNABORTED") {
      return { error: "❌ Timeout saat mengakses server. Coba lagi nanti." };
    }
    return { error: `❌ Gagal download Instagram: ${err.message}` };
  }
}

module.exports = {
  downloadInstagramVideo,
};
