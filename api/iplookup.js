/**
 * API untuk IP Lookup (Stalk)
 */
const axios = require("axios");

const IP_LOOKUP_API_URL = "https://www.sankavollerei.com/tools/iplookup";
const API_KEY = "planaai";

async function getIPInfo(ipAddress) {
  try {
    // Validasi format IP
    if (!ipAddress || typeof ipAddress !== "string") {
      return {
        data: null,
        error: "❌ Silakan berikan IP address yang valid.",
      };
    }

    // Simple IP validation (basic regex check)
    const ipRegex =
      /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (!ipRegex.test(ipAddress.trim())) {
      return {
        data: null,
        error: "❌ Format IP address tidak valid.",
      };
    }

    const response = await axios.get(IP_LOOKUP_API_URL, {
      params: {
        apikey: API_KEY,
        q: ipAddress.trim(),
      },
      timeout: 10000,
    });

    if (response.data && response.data.status && response.data.result) {
      const result = response.data.result;

      return {
        data: {
          ip: result.ip_address || ipAddress,
          hostname: result.hostname || "N/A",
          city: result.city || "N/A",
          region: result.region || "N/A",
          country: result.country || "N/A",
          latitude: result.latitude || "N/A",
          longitude: result.longitude || "N/A",
          organization: result.organization || "N/A",
          postal_code: result.postal_code || "N/A",
          timezone: result.timezone || "N/A",
        },
        error: null,
      };
    }

    return {
      data: null,
      error: "❌ Gagal mendapatkan informasi IP address.",
    };
  } catch (error) {
    console.error("Error saat lookup IP:", error.message);

    if (error.response?.status === 404) {
      return {
        data: null,
        error: "❌ IP address tidak ditemukan atau tidak valid.",
      };
    }

    return {
      data: null,
      error: `❌ Error: ${error.message}`,
    };
  }
}

module.exports = {
  getIPInfo,
};
