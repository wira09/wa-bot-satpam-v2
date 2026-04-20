const axios = require("axios");

async function searchWikipedia(query) {
  try {
    if (!query)
      return "❌ Mohon masukkan kata kunci untuk pencarian Wikipedia.";

    query = query.trim(); // 🔥 penting

    const url = `https://api.harzrestapi.web.id/api/v2/search/wikipedia?q=${encodeURIComponent(query)}&apikey=FREE`;
    const { data } = await axios.get(url, { timeout: 15000 });

    console.log("RAW WIKIPEDIA RESPONSE:", JSON.stringify(data, null, 2));

    // --- FIX 1: Corrected status check ---
    if (data.status !== true) {
      // Atau !data.success jika lebih konsisten untuk status error
      return `❌ API error (status: ${data.status})`;
    }

    // --- FIX 2: Akses data secara langsung, tidak ada nesting 'data.data' ---
    if (!data.success || !data.title) {
      return `❌ Tidak ada hasil ditemukan untuk: *${query}*`;
    }

    let response = `📚 *Wikipedia - ${data.title}*\n\n`; // Gunakan data.title
    response += `${data.summary || data.excerpt}\n\n`; // Gunakan data.summary/excerpt

    if (data.url) {
      // Gunakan data.url
      response += `🔗 Sumber: ${data.url}`;
    }

    return response.trim();
  } catch (error) {
    console.error("ERROR WIKIPEDIA:", error);
    return `❌ Gagal melakukan pencarian Wikipedia: ${error.message}`;
  }
}

module.exports = { searchWikipedia };
