/**
 * API untuk Generate QR Code
 */
const axios = require("axios");

const QRCODE_API_URL = "https://www.sankavollerei.com/tools/qrcode";
const API_KEY = "planaai";

async function generateQRCode(text) {
  try {
    // Validasi input
    if (!text || typeof text !== "string") {
      return {
        data: null,
        error: "❌ Silakan berikan text untuk di-generate menjadi QR code.",
      };
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return {
        data: null,
        error: "❌ Text tidak boleh kosong!",
      };
    }

    if (trimmedText.length > 2000) {
      return {
        data: null,
        error: "❌ Text terlalu panjang (max 2000 karakter)!",
      };
    }

    const response = await axios.get(QRCODE_API_URL, {
      params: {
        apikey: API_KEY,
        text: trimmedText,
      },
      timeout: 10000,
      responseType: "arraybuffer",
    });

    if (response.data && response.status === 200) {
      return {
        data: {
          image: Buffer.from(response.data),
          text: trimmedText,
          size: Buffer.from(response.data).length,
        },
        error: null,
      };
    }

    return {
      data: null,
      error: "❌ Gagal generate QR code.",
    };
  } catch (error) {
    console.error("Error saat generate QR code:", error.message);
    return {
      data: null,
      error: `❌ Error: ${error.message}`,
    };
  }
}

module.exports = {
  generateQRCode,
};
