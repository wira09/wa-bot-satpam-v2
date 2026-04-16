/**
 * API BMKG Info (siputzx)
 * Get earthquake information from BMKG (Indonesian Meteorology Agency)
 */
const axios = require("axios");

async function getBeritaBMKG() {
  try {
    const url = `https://api.siputzx.my.id/api/info/bmkg`;
    const res = await axios.get(url, { timeout: 15000 });

    // BMKG API returns data with different categories
    const data = res.data?.data;
    if (data) {
      return {
        auto: data.auto?.Infogempa?.gempa,
        terkini: data.terkini?.Infogempa?.gempa,
        dirasakan: data.dirasakan?.Infogempa?.gempa,
      };
    }

    return null;
  } catch (err) {
    throw new Error(`Gagal mengambil data BMKG: ${err.message}`);
  }
}

module.exports = {
  getBeritaBMKG,
};
