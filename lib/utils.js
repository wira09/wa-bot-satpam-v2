/**
 * Helper: format nomor & resolve LID → nomor HP
 */
const fs = require("fs");
const path = require("path");

function formatNumber(jid) {
  if (!jid) return "";
  return String(jid)
    .replace(/@s\.whatsapp\.net$/, "")
    .replace(/@g\.us$/, "");
}

/** Resolve JID (termasuk @lid dan @hosted.lid) ke nomor HP untuk cek admin */
function resolveSenderToNumber(jid) {
  if (!jid) return "";
  const lidMatch = String(jid).match(/^([^:]+)(?::\d+)?@(?:hosted\.)?lid$/);
  if (lidMatch) {
    const lidUser = lidMatch[1];
    const pathsToTry = [
      path.join(process.cwd(), "auth_info", `lid-mapping-${lidUser}_reverse.json`),
    ];
    for (const reversePath of pathsToTry) {
      if (fs.existsSync(reversePath)) {
        try {
          return fs.readFileSync(reversePath, "utf-8").trim();
        } catch {
          break;
        }
      }
    }
    return lidUser;
  }
  return formatNumber(jid);
}

module.exports = {
  formatNumber,
  resolveSenderToNumber,
};
