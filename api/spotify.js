const axios = require("axios");

async function downloadSpotify(spotifyUrl) {
  try {
    const apiUrl = `https://www.sankavollerei.com/download/spotify?apikey=planaai&url=${encodeURIComponent(spotifyUrl)}`;

    const response = await axios.get(apiUrl, { timeout: 60000 });

    if (!response.data.status || !response.data.data) {
      return {
        status: false,
        error: "Gagal mengambil data dari Spotify",
      };
    }

    const { data } = response.data;

    return {
      status: true,
      title: data.title || "Unknown",
      artist: data.artis || "Unknown Artist",
      album: data.album || "Unknown Album",
      image: data.image || null,
      duration: data.durasi || 0,
      releaseDate: data.releaseDate || "Unknown",
      downloadUrl: data.download || null,
      size: data.size || 0,
      source: data.source || "Spotidown",
    };
  } catch (error) {
    console.error("Error downloading Spotify:", error.message);
    return {
      status: false,
      error: error.message || "Gagal mengunduh dari Spotify",
    };
  }
}

module.exports = { downloadSpotify };
