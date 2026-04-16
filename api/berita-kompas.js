const axios = require("axios");

const KOMPAS_ENDPOINT = "https://api.siputzx.my.id/api/berita/kompas";

async function getBeritaKompas() {
  try {
    const res = await axios.get(KOMPAS_ENDPOINT, { timeout: 15000 });

    const status = res.data?.status;
    const data = res.data?.data;

    if (status && Array.isArray(data) && data.length > 0) {
      const normalized = data.map((item) => ({
        title: typeof item?.title === "string" ? item.title.trim() : "",
        url: item?.link || null, // alias agar konsisten dengan pemakaian `url`
        link: item?.link || null,
        image: item?.image || null,
        category: item?.category || null,
        date: item?.date || null,
      }));

      return normalized;
    }

    return null;
  } catch (err) {
    throw new Error(`Gagal mengambil berita Kompas: ${err.message}`);
  }
}

module.exports = {
  getBeritaKompas,
};
