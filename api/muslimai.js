/**
 * API Muslim AI (Harz Rest API)
 */
const axios = require("axios");

async function askMuslimAI(prompt) {
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://api.harzrestapi.web.id/api/v2/muslimai?q=${encodedPrompt}&apikey=FREE`;
    const res = await axios.get(url, { timeout: 15000 });
    
    // Based on test result, the answer string is in 'result' field
    // 'data' field contains an object with sources
    const result = res.data?.result || res.data?.data?.answer;
    
    if (result) {
      return result;
    }

    return `❌ Gagal mendapatkan respons dari Muslim AI`;
  } catch (err) {
    return `❌ Gagal menghubungi Muslim AI: ${err.message}`;
  }
}

module.exports = {
  askMuslimAI,
};
