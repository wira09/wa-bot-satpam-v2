/**
 * API untuk Subdomain Lookup
 */
const axios = require("axios");

const SUBDOMAIN_API_URL = "https://api.siputzx.my.id/api/tools/subdomains";

async function getSubdomains(domain) {
  try {
    // Validasi domain
    if (!domain || typeof domain !== "string") {
      return {
        data: null,
        error: "❌ Silakan berikan domain yang valid.",
      };
    }

    // Validasi format domain (basic check)
    if (
      !/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(
        domain.trim().toLowerCase(),
      )
    ) {
      return {
        data: null,
        error: "❌ Format domain tidak valid. Contoh: siputzx.my.id",
      };
    }

    const response = await axios.get(SUBDOMAIN_API_URL, {
      params: {
        domain: domain.trim().toLowerCase(),
      },
      timeout: 15000,
    });

    if (response.data && response.data.status && response.data.data) {
      const results = response.data.data;

      // Parse subdomains dari results (beberapa mungkin punya multiple subdomains terpisah \n)
      const allSubdomains = new Set();
      for (const item of results) {
        if (typeof item === "string") {
          // Split by newline dan tambahkan ke set (untuk unique values)
          const subs = item
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          subs.forEach((sub) => allSubdomains.add(sub));
        }
      }

      return {
        data: {
          domain: domain.trim().toLowerCase(),
          subdomains: Array.from(allSubdomains).sort(),
          count: allSubdomains.size,
          timestamp: response.data.timestamp || new Date().toISOString(),
        },
        error: null,
      };
    }

    return {
      data: null,
      error: "❌ Tidak menemukan subdomain untuk domain ini.",
    };
  } catch (error) {
    console.error("Error saat lookup subdomain:", error.message);

    if (error.response?.status === 404) {
      return {
        data: null,
        error: "❌ Domain tidak ditemukan.",
      };
    }

    return {
      data: null,
      error: `❌ Error: ${error.message}`,
    };
  }
}

module.exports = {
  getSubdomains,
};
