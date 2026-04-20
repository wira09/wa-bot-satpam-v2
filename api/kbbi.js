const axios = require("axios");

async function searchKbbi(query) {
  try {
    if (!query) return "❌ Mohon masukkan kata yang ingin dicari.";

    query = query.trim(); // 🔥 penting

    const url = `https://api.harzrestapi.web.id/api/v2/search/kbbi?q=${encodeURIComponent(query)}&apikey=FREE`;
    const { data } = await axios.get(url, { timeout: 15000 });

    console.log("RAW:", JSON.stringify(data, null, 2)); // debug

    if (Number(data.status) !== 200) {
      return `❌ API error (status: ${data.status})`;
    }

    // Perubahan di sini: Mengakses properti langsung dari 'data'
    if (data.success !== true || !data.definition) {
      return `❌ Definisi tidak ditemukan untuk: *${query}*`;
    }

    let response = `📖 *KBBI - ${data.word.toUpperCase()}*\n\n`;
    response += `${data.definition}\n\n`;

    if (data.url) {
      response += `🔗 _Sumber: ${data.url}_`;
    }

    return response.trim();
  } catch (error) {
    console.error("ERROR:", error);
    return `❌ Gagal melakukan pencarian KBBI: ${error.message}`;
  }
}

module.exports = { searchKbbi };
