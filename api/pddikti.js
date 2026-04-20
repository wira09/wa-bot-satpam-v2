const axios = require("axios");

async function searchPddikti(query) {
  try {
    if (!query) return "❌ Mohon masukkan nama yang ingin dicari.";

    query = query.trim(); // 🔥 penting

    const url = `https://api.harzrestapi.web.id/api/v2/search/pddikti?apikey=FREE&q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { timeout: 15000 });

    console.log("RAW RESPONSE:", JSON.stringify(data, null, 2));

    if (Number(data.status) !== 200) {
      return `❌ API error (status: ${data.status})`;
    }

    // ...existing code...

    console.log("Checking data.result:", {
      // Changed from data.data to data.result
      is_array: Array.isArray(data.result), // Changed from data.data to data.result
      length: data.result ? data.result.length : "N/A", // Changed from data.data to data.result
      content_type: typeof data.result, // Changed from data.data to data.result
      content_value: JSON.stringify(data.result, null, 2), // Changed from data.data to data.result
    });

    if (!Array.isArray(data.result) || data.result.length === 0) {
      // Changed from data.data to data.result
      return `❌ Data tidak ditemukan untuk: *${query}*`;
    }

    let response = `🎓 *Hasil Pencarian PDDIKTI*\n\n`;

    data.result.forEach((item, index) => {
      // Changed from data.data to data.result
      response += `*${index + 1}. ${item.nama}*\n`;
      response += `• NIM: ${item.nim}\n`;
      response += `• Kampus: ${item.nama_pt} (${item.sinkatan_pt})\n`;
      response += `• Prodi: ${item.nama_prodi}\n\n`;
    });

    return response.trim();
  } catch (error) {
    console.error("ERROR FULL:", error);
    return `❌ Gagal melakukan pencarian PDDIKTI: ${error.message}`;
  }
}

module.exports = { searchPddikti };
