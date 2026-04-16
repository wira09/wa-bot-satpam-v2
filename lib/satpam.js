/**
 * Deteksi satpam grup: promo, toxic, link, jailbreak, invis, spam
 */
const spamTracker = new Map();
const SPAM_WINDOW_MS = 15000;
const SPAM_SAME_COUNT = 4;
const SPAM_TOTAL_COUNT = 8;

function containsPromo(text) {
  try {
    if (!text || typeof text !== "string") return false;
    const promoKeywords = [
      /\bdiskon\b/i,
      /\bpromo\b/i,
      /\bharga\b/i,
      /\border\b/i,
      /\bcod\b/i,
      /\bwholesale\b/i,
      /\bdapatkan\b/i,
    ];
    return promoKeywords.some((pattern) => pattern.test(text));
  } catch (error) {
    console.error("Error checking promo:", error);
    return false;
  }
}

function containsToxic(text) {
  try {
    if (!text || typeof text !== "string") return false;
    const toxicKeywords = [
      /\bbodoh\b/i,
      /\bb0d0h\b/i,
      /\banjing\b/i,
      /\bbabi\b/i,
      /\bgoblog\b/i,
      /\bidiot\b/i,
      /\bbangsat\b/i,
      /\bb4ngs4t\b/i,
      /\bkontol\b/i,
      /\bk0nt0l\b/i,
      /\bmemek\b/i,
      /\bm3m3k\b/i,
      /\btolol\b/i,
      /\bt0l0l\b/i,
      /\blaskar\b/i,
      /\bAnjjj\b/i,
      /\b4nj1ng\b/i,
      /\bKntl\b/i,
    ];
    return toxicKeywords.some((pattern) => pattern.test(text));
  } catch (error) {
    console.error("Error checking toxic:", error);
    return false;
  }
}

function containsGroupLink(text) {
  try {
    if (!text || typeof text !== "string") return false;
    return /chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(text);
  } catch (error) {
    console.error("Error checking group link:", error);
    return false;
  }
}

function containsChannelLink(text) {
  try {
    if (!text || typeof text !== "string") return false;
    return /whatsapp\.com\/channel\/[A-Za-z0-9]+/.test(text);
  } catch (error) {
    console.error("Error checking channel link:", error);
    return false;
  }
}

function containsLynkLink(text) {
  try {
    if (!text || typeof text !== "string") return false;
    return /lynk\.id\/[A-Za-z0-9]+/.test(text);
  } catch (error) {
    console.error("Error checking lynk link:", error);
    return false;
  }
}

function containsWALink(text) {
  try {
    if (!text || typeof text !== "string") return false;
    return /wa\.me\/[A-Za-z0-9]+/.test(text);
  } catch (error) {
    console.error("Error checking WA link:", error);
    return false;
  }
}

function containsURLLink(text) {
  try {
    if (!text || typeof text !== "string") return false;
    // Deteksi URL umum (http://, https://, www., atau domain.com)
    // return /https?:\/\/|www\.|[\w-]+\.[a-z]{2,}(?:\/|\?|#|$)/i.test(text);
    return false;
  } catch (error) {
    console.error("Error checking URL link:", error);
    return false;
  }
}

function containsGroupOrChannelLink(text) {
  try {
    if (!text || typeof text !== "string") return false;
    return (
      containsGroupLink(text) ||
      containsChannelLink(text) ||
      containsLynkLink(text) ||
      containsWALink(text) ||
      containsURLLink(text)
    );
  } catch (error) {
    console.error("Error checking link:", error);
    return false;
  }
}

function containsJailbreak(text) {
  try {
    if (!text || typeof text !== "string") return false;
    const jailbreakKeywords = [
      /\bjailbreak\b/i,
      /\broot\s*(hp|hp android|android)?\b/i,
      /\bbypass\s*(wa|whatsapp)\b/i,
      /\bunlock\s*(wa|whatsapp)\b/i,
      /\bmod\s*wa\b/i,
      /\bwhatsapp\s*mod\b/i,
      /\bgb\s*wa\b/i,
      /\bwa\s*gb\b/i,
      /\bfouad\b/i,
      /\bblue\s*stacks?\b/i,
      /\bparallel\s*space\b/i,
    ];
    return jailbreakKeywords.some((p) => p.test(text));
  } catch (error) {
    console.error("Error checking jailbreak:", error);
    return false;
  }
}

function hasInvisibleAbuse(text) {
  try {
    if (!text || typeof text !== "string") return false;
    const zeroWidth = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
    const stripped = text.replace(zeroWidth, "").trim();
    return stripped.length === 0 && text.length > 0;
  } catch (error) {
    console.error("Error checking invisible abuse:", error);
    return false;
  }
}

function isSpam(groupId, senderJid, text) {
  try {
    if (!groupId || !senderJid) return false;
    const key = `${groupId}_${senderJid}`;
    const now = Date.now();
    if (!spamTracker.has(key)) spamTracker.set(key, []);
    const list = spamTracker.get(key);
    list.push({ text: (text || "").trim(), time: now });
    while (list.length && list[0].time < now - SPAM_WINDOW_MS) list.shift();
    const sameText = list.filter(
      (m) => (m.text || "") === (text || "").trim(),
    ).length;
    if (sameText >= SPAM_SAME_COUNT || list.length >= SPAM_TOTAL_COUNT) {
      spamTracker.set(key, []);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking spam:", error);
    return false;
  }
}

module.exports = {
  containsPromo,
  containsToxic,
  containsGroupLink,
  containsChannelLink,
  containsLynkLink,
  containsWALink,
  containsURLLink,
  containsGroupOrChannelLink,
  containsJailbreak,
  hasInvisibleAbuse,
  isSpam,
};
