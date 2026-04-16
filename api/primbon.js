/**
 * API Primbon (siputzx): kecocokan nama pasangan, arti nama
 */
const axios = require("axios");

const BASE = "https://api.siputzx.my.id/api/primbon";

async function primbonCocokNamaPasangan(nama1, nama2) {
  try {
    const url =
      `${BASE}/kecocokan_nama_pasangan` +
      `?nama1=${encodeURIComponent(nama1)}&nama2=${encodeURIComponent(nama2)}`;
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data?.data;
    if (!data) return "❌ Gagal membaca hasil primbon pasangan.";
    return (
      "💘 *Kecocokan Nama Pasangan*\n\n" +
      `• Nama kamu   : *${data.nama_anda}*\n` +
      `• Nama pasangan: *${data.nama_pasangan}*\n\n` +
      "✅ *Sisi positif:*\n" +
      `${data.sisi_positif || "-"}\n\n` +
      "⚠️ *Sisi negatif:*\n" +
      `${data.sisi_negatif || "-"}\n\n` +
      (data.catatan ? `📝 *Catatan:*\n${data.catatan}` : "")
    );
  } catch (err) {
    return `❌ Gagal memanggil primbon pasangan: ${err.message}`;
  }
}

async function primbonArtiNama(nama) {
  try {
    const url = `${BASE}/artinama?nama=${encodeURIComponent(nama)}`;
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data?.data;
    if (!data) return "❌ Gagal membaca hasil arti nama.";
    return (
      "🔤 *Arti Nama Menurut Primbon*\n\n" +
      `• Nama : *${data.nama}*\n\n` +
      "📖 *Arti:*\n" +
      `${data.arti || "-"}\n\n` +
      (data.catatan ? `📝 *Catatan:*\n${data.catatan}` : "")
    );
  } catch (err) {
    return `❌ Gagal memanggil primbon arti nama: ${err.message}`;
  }
}

module.exports = {
  primbonCocokNamaPasangan,
  primbonArtiNama,
};
