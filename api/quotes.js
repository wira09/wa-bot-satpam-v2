/**
 * API untuk ambil random quotes
 */
const axios = require("axios");

const QUOTES_API_URL =
  "https://www.sankavollerei.com/random/quotes?apikey=planaai";

async function getRandomQuotes() {
  try {
    const response = await axios.get(QUOTES_API_URL, {
      timeout: 10000,
    });

    if (response.data) {
      const data = response.data;

      // Handle struktur: { result: { quotes: [...] } } - array string
      if (
        data.result &&
        data.result.quotes &&
        Array.isArray(data.result.quotes) &&
        data.result.quotes.length > 0
      ) {
        const randomIndex = Math.floor(
          Math.random() * data.result.quotes.length,
        );
        const quote = data.result.quotes[randomIndex];
        return {
          quote: quote,
          author: data.creator || data.by || "Sanka Vollerei",
          error: null,
        };
      }
      // Handle struktur: { quotes: [...] } - array string
      else if (
        data.quotes &&
        Array.isArray(data.quotes) &&
        data.quotes.length > 0
      ) {
        const randomIndex = Math.floor(Math.random() * data.quotes.length);
        const quote = data.quotes[randomIndex];
        return {
          quote: quote,
          author: data.author || "Unknown",
          error: null,
        };
      }
      // Handle struktur: { quote: "...", author: "..." } - object dengan property
      else if (data.quote && typeof data.quote === "string") {
        return {
          quote: data.quote,
          author: data.author || "Unknown",
          error: null,
        };
      }
      // Handle nested data
      else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.data.length);
        const quoteData = data.data[randomIndex];
        return {
          quote:
            typeof quoteData === "string"
              ? quoteData
              : quoteData.quote || quoteData.text,
          author:
            typeof quoteData === "string"
              ? "Unknown"
              : quoteData.author || "Unknown",
          error: null,
        };
      }
    }

    return {
      quote: null,
      author: null,
      error: "❌ Format response API tidak sesuai.",
    };
  } catch (error) {
    console.error("Error saat ambil quotes:", error.message);
    return {
      quote: null,
      author: null,
      error: `❌ Gagal mengambil quotes: ${error.message}`,
    };
  }
}

module.exports = {
  getRandomQuotes,
};
