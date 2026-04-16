/**
 * API Cek Cuaca (Sanka Vollerei)
 * Check weather information for specific cities
 */
const axios = require("axios");

async function checkCuaca(kota) {
  try {
    const encodedKota = encodeURIComponent(kota);
    const url = `https://www.sankavollerei.com/tools/cekcuaca?apikey=planaai&kota=${encodedKota}`;
    const res = await axios.get(url, { timeout: 15000 });

    // Cek cuaca API returns data directly in response
    if (res.data?.status && res.data?.lokasi) {
      return {
        lokasi: res.data.lokasi,
        kondisi: res.data.kondisi,
        suhu: res.data.suhu,
        kelembaban: res.data.kelembaban,
        angin: res.data.angin,
      };
    }

    return null;
  } catch (err) {
    throw new Error(`Gagal mengecek cuaca: ${err.message}`);
  }
}

module.exports = {
  checkCuaca,
};
