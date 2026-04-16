/**
 * API untuk Jadwal Sholat
 */
const axios = require("axios");

const JADWAL_SHOLAT_API_URL =
  "https://www.sankavollerei.com/tools/jadwalsholat";
const API_KEY = "planaai";

async function getJadwalSholat(kota) {
  try {
    // Validasi input
    if (!kota || typeof kota !== "string") {
      return {
        data: null,
        error: "❌ Silakan berikan nama kota yang valid.",
      };
    }

    const response = await axios.get(JADWAL_SHOLAT_API_URL, {
      params: {
        apikey: API_KEY,
        kota: kota.trim(),
      },
      timeout: 10000,
    });

    if (response.data && response.data.status && response.data.jadwal) {
      const result = response.data;

      return {
        data: {
          kota: result.kota || kota,
          tanggal: result.tanggal || "N/A",
          imsak: result.jadwal.imsak || "N/A",
          subuh: result.jadwal.subuh || "N/A",
          terbit: result.jadwal.terbit || "N/A",
          dzuhur: result.jadwal.dzuhur || "N/A",
          ashar: result.jadwal.ashar || "N/A",
          maghrib: result.jadwal.maghrib || "N/A",
          isya: result.jadwal.isya || "N/A",
          tengahMalam: result.jadwal.tengah_malam || "N/A",
          catatan: result.catatan || "N/A",
        },
        error: null,
      };
    }

    return {
      data: null,
      error: "❌ Kota tidak ditemukan atau gagal mengambil jadwal sholat.",
    };
  } catch (error) {
    console.error("Error saat ambil jadwal sholat:", error.message);

    if (error.response?.status === 404) {
      return {
        data: null,
        error: "❌ Kota tidak ditemukan.",
      };
    }

    return {
      data: null,
      error: `❌ Error: ${error.message}`,
    };
  }
}

module.exports = {
  getJadwalSholat,
};
