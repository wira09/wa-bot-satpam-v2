const axios = require("axios");

const BASE = "https://api.siputzx.my.id/api/games/caklontong";

async function getCaklontongQuestion() {
  try {
    const res = await axios.get(BASE, { timeout: 15000 });
    const data = res.data?.data;
    if (!data)
      return { error: "❌ Gagal mendapatkan soal Caklontong dari API." };
    return data;
  } catch (err) {
    return { error: `❌ Gagal memanggil API Caklontong: ${err.message}` };
  }
}

module.exports = {
  getCaklontongQuestion,
};
