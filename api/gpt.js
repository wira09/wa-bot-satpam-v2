const axios = require("axios");

async function askGPT(message, model = "gpt-4o-mini") {
  try {
    const systemPrompt = "You are a helpful assistant.";
    const apiUrl = `https://api.siputzx.my.id/api/ai/duckai`;

    const response = await axios.get(apiUrl, {
      params: {
        message: message,
        model: model,
        systemPrompt: systemPrompt,
      },
      timeout: 60000,
    });

    if (!response.data.status) {
      return {
        error: response.data.message || "Gagal mendapatkan respons dari GPT",
      };
    }

    // Extract answer dari response
    let answer = "Tidak ada respons";

    if (response.data.data) {
      // Jika data adalah string
      if (typeof response.data.data === "string") {
        answer = response.data.data;
      }
      // Jika data adalah object, cari property text/response
      else if (typeof response.data.data === "object") {
        answer =
          response.data.data.text ||
          response.data.data.response ||
          response.data.data.message ||
          JSON.stringify(response.data.data);
      }
    } else if (response.data.message) {
      answer = response.data.message;
    }

    return {
      status: true,
      answer: answer,
    };
  } catch (error) {
    console.error("Error asking GPT:", error.message);
    return {
      error: error.message || "Gagal menghubungi GPT",
    };
  }
}

module.exports = { askGPT };
