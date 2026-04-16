/**
 * API Arona (Sanka Vollerei)
 * Character AI - Arona Sensei
 */
const axios = require("axios");

async function askArona(text) {
  try {
    const encodedText = encodeURIComponent(text);
    const url = `https://www.sankavollerei.com/ai/arona?apikey=planaai&text=${encodedText}`;
    const res = await axios.get(url, { timeout: 15000 });

    // Arona API returns response in result field
    const result = res.data?.result;
    if (result) {
      return result;
    }

    return `❌ Gagal mendapatkan respons dari Arona`;
  } catch (err) {
    return `❌ Gagal menghubungi Arona: ${err.message}`;
  }
}

module.exports = {
  askArona,
};
