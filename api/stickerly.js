/**
 * API Stickerly Search (Sanka Vollerei)
 * Search for sticker packs on Stickerly
 */
const axios = require("axios");

async function searchStickerly(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.sankavollerei.com/search/stickerly?apikey=planaai&q=${encodedQuery}`;
    const res = await axios.get(url, { timeout: 15000 });

    // Stickerly API returns array of sticker packs in result field
    const result = res.data?.result;
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }

    return null;
  } catch (err) {
    throw new Error(`Gagal mencari stiker: ${err.message}`);
  }
}

module.exports = {
  searchStickerly,
};
