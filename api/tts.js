const axios = require("axios");

const TTS_API_URL = "https://www.sankavollerei.com/tools/text-to-speech";
const API_KEY = "planaai";

async function getTextToSpeech(text, voiceName = null) {
  try {
    // Validasi input
    if (!text || typeof text !== "string") {
      return {
        data: null,
        error: "❌ Silakan berikan text untuk di-convert menjadi suara.",
      };
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return {
        data: null,
        error: "❌ Text tidak boleh kosong!",
      };
    }

    if (trimmedText.length > 500) {
      return {
        data: null,
        error: "❌ Text terlalu panjang (max 500 karakter)!",
      };
    }

    const response = await axios.get(TTS_API_URL, {
      params: {
        apikey: API_KEY,
        text: trimmedText,
      },
      timeout: 15000,
    });

    if (response.data && response.data.status && response.data.result) {
      const results = response.data.result;

      // Filter hasil yang berhasil
      const voices = results
        .filter((item) => !item.error && item.voice_name)
        .map((item) => {
          // Cari audio URL
          const audioUrl =
            item.nahida ||
            item.nami ||
            item.ana ||
            item.optimus_prime ||
            item.goku ||
            item.elon_musk ||
            item.mickey_mouse ||
            item.kendrick_lamar ||
            item.eminem ||
            null;

          return {
            name: item.voice_name,
            url: audioUrl,
            channelId: item.channel_id,
            voiceId: item.voice_id,
          };
        })
        .filter((v) => v.url); // Pastikan ada URL audio

      if (!voices.length) {
        return {
          data: null,
          error: "❌ Tidak ada voice yang tersedia untuk TTS.",
        };
      }

      // Jika voiceName diberikan, cari yang sesuai
      let selectedVoice = voices[0];
      if (voiceName) {
        const found = voices.find(
          (v) => v.name.toLowerCase() === voiceName.toLowerCase(),
        );
        if (found) {
          selectedVoice = found;
        }
      }

      // Validasi URL audio
      if (!selectedVoice.url || typeof selectedVoice.url !== "string") {
        return {
          data: null,
          error: "❌ Audio URL tidak valid dari API.",
        };
      }

      return {
        data: {
          text: trimmedText,
          selectedVoice,
          allVoices: voices,
        },
        error: null,
      };
    }

    return {
      data: null,
      error: "❌ Gagal mendapatkan TTS dari API.",
    };
  } catch (error) {
    console.error("Error saat TTS:", error.message);
    return {
      data: null,
      error: `❌ Error: ${error.message}`,
    };
  }
}

async function getVoicesList() {
  try {
    const response = await axios.get(TTS_API_URL, {
      params: {
        apikey: API_KEY,
        text: "test",
      },
      timeout: 10000,
    });

    if (response.data && response.data.status && response.data.result) {
      const voices = response.data.result
        .filter((item) => !item.error && item.voice_name)
        .map((item) => item.voice_name);

      return {
        voices: [...new Set(voices)], // Remove duplicates
        error: null,
      };
    }

    return {
      voices: [],
      error: "Failed to get voices list",
    };
  } catch (error) {
    console.error("Error saat get voices list:", error.message);
    return {
      voices: [],
      error: error.message,
    };
  }
}

module.exports = {
  getTextToSpeech,
  getVoicesList,
};
