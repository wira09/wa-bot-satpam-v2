/**
 * API Instagram Downloader (Sanka Vollerei)
 */
const axios = require("axios");

const API_KEY = "planaai";
const BASE_URL = "https://www.sankavollerei.com/download/instagram";

async function downloadInstagram(url) {
  try {
    if (!url || typeof url !== "string") {
      return { error: "❌ URL Instagram tidak valid." };
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
          "❌ Gagal mengekstrak konten Instagram. URL mungkin invalid atau konten tidak tersedia.",
      };
    }

    const result = data.result;
    const mediaList = result.media || [];

    if (!mediaList || mediaList.length === 0) {
      return { error: "❌ Tidak ada media yang ditemukan di URL ini." };
    }

    // Validasi dan ambil URL media pertama yang valid
    let mediaItem = null;
    for (const item of mediaList) {
      if (item.url) {
        mediaItem = item;
        break;
      }
    }

    if (!mediaItem || !mediaItem.url) {
      return { error: "❌ Link media tidak dapat diakses." };
    }

    const mediaType = mediaItem.type || "unknown";
    const isVideo = mediaType === "video" || mediaItem.url.includes(".mp4");

    // Jika caption kosong, gunakan "Instagram Media" sebagai default
    let caption =
      (result.caption && result.caption.trim()) || "Instagram Media";

    // Batasi caption terlalu panjang
    if (caption.length > 300) {
      caption = caption.substring(0, 297) + "...";
    }

    return {
      caption: caption,
      author: (result.author && result.author.trim()) || null,
      mediaUrl: mediaItem.url,
      mediaType: isVideo ? "video" : "image",
      totalMedia: mediaList.length,
    };
  } catch (err) {
    console.error("[Instagram] Error:", err.message);
    if (err.response?.status === 404) {
      return {
        error:
          "❌ Konten Instagram tidak ditemukan. Pastikan link valid dan akun tidak private.",
      };
    }
    if (err.code === "ECONNABORTED") {
      return { error: "❌ Timeout saat mengakses server. Coba lagi nanti." };
    }
    return { error: `❌ Gagal download Instagram: ${err.message}` };
  }
}

module.exports = {
  downloadInstagram,
};
