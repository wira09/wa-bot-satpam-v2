/**
 * Database sederhana (JSON) + admin & peringatan link
 */
const fs = require("fs");
const { CONFIG, DB_FILE } = require("../config");

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({
        admins: [CONFIG.ownerNumber, "6283841407959"],
        linkWarnings: {},
      }),
    );
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (!data.linkWarnings) data.linkWarnings = {};
  return data;
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function normalizePhoneForCompare(num) {
  if (!num || typeof num !== "string") return "";
  const digits = num.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (!digits.startsWith("62")) return "62" + digits;
  return digits;
}

function isAdmin(number) {
  try {
    if (!number || typeof number !== "string") return false;
    const db = loadDB();
    if (!db.admins || !Array.isArray(db.admins)) return false;
    const normalized = normalizePhoneForCompare(number);
    return db.admins.some((a) => normalizePhoneForCompare(a) === normalized);
  } catch (error) {
    console.error("Error checking admin:", error);
    return false;
  }
}

function addAdmin(number) {
  try {
    if (!number || typeof number !== "string" || number.length < 10) {
      return false;
    }
    const db = loadDB();
    if (!db.admins) db.admins = [];
    if (!db.admins.includes(number)) {
      db.admins.push(number);
      saveDB(db);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error adding admin:", error);
    return false;
  }
}

function removeAdmin(number) {
  try {
    if (!number || typeof number !== "string") return false;
    const db = loadDB();
    if (!db.admins || !Array.isArray(db.admins)) return false;
    const initialLength = db.admins.length;
    db.admins = db.admins.filter((n) => n !== number);
    if (db.admins.length < initialLength) {
      saveDB(db);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error removing admin:", error);
    return false;
  }
}

// Peringatan link (untuk link grup/saluran & promo)
function getLinkWarningKey(groupId, senderNumber) {
  if (!groupId || !senderNumber) return "";
  return `${groupId}_${senderNumber}`;
}

function getLinkWarningCount(groupId, senderNumber) {
  try {
    const db = loadDB();
    const key = getLinkWarningKey(groupId, senderNumber);
    if (!key) return 0;
    return db.linkWarnings?.[key] || 0;
  } catch (error) {
    console.error("Error getting link warning count:", error);
    return 0;
  }
}

function addLinkWarning(groupId, senderNumber) {
  try {
    const db = loadDB();
    const key = getLinkWarningKey(groupId, senderNumber);
    if (!key) return false;
    if (!db.linkWarnings) db.linkWarnings = {};
    db.linkWarnings[key] = (db.linkWarnings[key] || 0) + 1;
    saveDB(db);
    return true;
  } catch (error) {
    console.error("Error adding link warning:", error);
    return false;
  }
}

function clearLinkWarning(groupId, senderNumber) {
  try {
    const db = loadDB();
    const key = getLinkWarningKey(groupId, senderNumber);
    if (!key || !db.linkWarnings) return false;
    if (key in db.linkWarnings) {
      delete db.linkWarnings[key];
      saveDB(db);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error clearing link warning:", error);
    return false;
  }
}

module.exports = {
  loadDB,
  saveDB,
  normalizePhoneForCompare,
  isAdmin,
  addAdmin,
  removeAdmin,
  getLinkWarningKey,
  getLinkWarningCount,
  addLinkWarning,
  clearLinkWarning,
};
