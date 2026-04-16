/**
 * API untuk Primbon Sifat Usaha Bisnis
 */
const axios = require("axios");

const PRIMBON_BISNIS_API_URL =
  "https://api.siputzx.my.id/api/primbon/sifat_usaha_bisnis";

async function getPrimbonBisnis(tanggal, bulan, tahun) {
  try {
    // Validasi input
    if (!tanggal || !bulan || !tahun) {
      return {
        data: null,
        error:
          "❌ Format: !bisnismu <tanggal> <bulan> <tahun>\nContoh: !bisnismu 1 1 2000",
      };
    }

    // Konversi ke number dan validasi
    const tgl = parseInt(tanggal, 10);
    const bln = parseInt(bulan, 10);
    const thn = parseInt(tahun, 10);

    if (isNaN(tgl) || isNaN(bln) || isNaN(thn)) {
      return {
        data: null,
        error:
          "❌ Tanggal, bulan, dan tahun harus berupa angka!\nContoh: !bisnismu 1 1 2000",
      };
    }

    if (tgl < 1 || tgl > 31) {
      return {
        data: null,
        error: "❌ Tanggal harus antara 1-31!",
      };
    }

    if (bln < 1 || bln > 12) {
      return {
        data: null,
        error: "❌ Bulan harus antara 1-12!",
      };
    }

    if (thn < 1900 || thn > new Date().getFullYear()) {
      return {
        data: null,
        error: `❌ Tahun harus antara 1900-${new Date().getFullYear()}!`,
      };
    }

    const response = await axios.get(PRIMBON_BISNIS_API_URL, {
      params: {
        tgl,
        bln,
        thn,
      },
      timeout: 10000,
    });

    if (response.data && response.data.status && response.data.data) {
      const result = response.data.data;

      return {
        data: {
          hariLahir: result.hari_lahir || "N/A",
          usaha: result.usaha || "N/A",
          catatan: result.catatan || "N/A",
          timestamp: response.data.timestamp || new Date().toISOString(),
        },
        error: null,
      };
    }

    return {
      data: null,
      error: "❌ Gagal mendapatkan data primbon bisnis.",
    };
  } catch (error) {
    console.error("Error saat ambil primbon bisnis:", error.message);
    return {
      data: null,
      error: `❌ Error: ${error.message}`,
    };
  }
}

module.exports = {
  getPrimbonBisnis,
};
