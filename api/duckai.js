/**
 * API DuckAI (siputzx)
 * Supports GPT-4o-mini model
 */
const axios = require("axios");

function ensureString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    if (typeof value.message === "string") return value.message;
    if (typeof value.content === "string") return value.content;
    if (typeof value.response === "string") return value.response;
    if (Array.isArray(value.parts) && value.parts[0]?.text)
      return value.parts[0].text.trim();
    const cand = value.candidates?.[0];
    if (Array.isArray(cand?.content?.parts) && cand.content.parts[0]?.text)
      return cand.content.parts[0].text.trim();
    if (Array.isArray(value) && value[0]?.text) return value[0].text;
    return JSON.stringify(value);
  }
  return String(value);
}

async function askDuckAI(prompt) {
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://api.siputzx.my.id/api/ai/duckai?message=${encodedPrompt}&model=gpt-4o-mini&systemPrompt=You+are+a+helpful+assistant.`;
    const res = await axios.get(url, { timeout: 15000 });
    console.log("DuckAI Response:", JSON.stringify(res.data, null, 2));

    // DuckAI returns response in data.data.message
    const message = res.data?.data?.message;
    if (message) {
      return message;
    }

    // Fallback to other structures
    const raw = res.data?.data ?? res.data?.result ?? res.data;
    return ensureString(raw);
  } catch (err) {
    console.error("DuckAI Error:", err.message);
    return `❌ Gagal menghubungi DuckAI: ${err.message}`;
  }
}

module.exports = {
  askDuckAI,
  ensureString,
};
