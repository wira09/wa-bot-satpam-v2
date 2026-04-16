/**
 * API Berita CNN Indonesia (Sanka Vollerei)
 * Get latest news from CNN Indonesia
 */
const axios = require("axios");

async function getBeritaCNN() {
  try {
    const url = `https://www.sankavollerei.com/berita/cnn?apikey=planaai`;
    const res = await axios.get(url, { timeout: 15000 });

    // CNN API returns array of news in result field
    const result = res.data?.result;
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }

    return null;
  } catch (err) {
    throw new Error(`Gagal mengambil berita: ${err.message}`);
  }
}

module.exports = {
  getBeritaCNN,
};
