/**
 * API SoundCloud downloader (siputzx)
 */
const axios = require("axios");

const BASE = "https://api.siputzx.my.id/api/d";

async function soundcloud(url) {
  try {
    const res = await axios.get(`${BASE}/soundcloud`, {
      params: { url },
      timeout: 15000,
    });

    const data = res.data?.data;
    if (!data) return { error: "❌ Gagal membaca hasil soundcloud." };

    const audioUrl = data.audio || data.url || data.download;
    if (!audioUrl) return { error: "❌ Link audio tidak ditemukan." };

    return {
      title: data.title || "Unknown",
      author: data.author || "Unknown",
      audioUrl,
    };
  } catch (err) {
    return { error: `❌ Gagal memanggil soundcloud: ${err.message}` };
  }
}

async function tiktok(url) {
  try {
    const res = await axios.get(`${BASE}/tiktok/v2`, {
      params: { url },
      timeout: 15000,
    });

    const data = res.data?.data;
    if (!data) return { error: "❌ Gagal membaca hasil tiktok." };

    const videoUrl = data.no_watermark_link_hd || data.no_watermark_link;
    if (!videoUrl) return { error: "❌ Link video tidak ditemukan." };

    // Download buffer
    const videoBuffer = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.tiktok.com/",
      },
    });

    return {
      title: data.text || "TikTok Video",
      author: data.author_nickname || "Unknown",
      likes: data.like_count || "0",
      views: data.play_count || "0",
      buffer: Buffer.from(videoBuffer.data),
    };
  } catch (err) {
    return { error: `❌ Gagal memanggil tiktok: ${err.message}` };
  }
}

module.exports = { soundcloud, tiktok };
