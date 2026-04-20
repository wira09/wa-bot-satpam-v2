const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  MessageType,
  Mimetype,
  downloadContentFromMessage, // Tambahkan ini
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const axios = require("axios");

const CONFIG = require("./config");
const db = require("./lib/database");
const { formatNumber, resolveSenderToNumber } = require("./lib/utils");
const { askDuckAI } = require("./api/duckai");
const { askMuslimAI } = require("./api/muslimai");
const { askArona } = require("./api/arona");
const { askGPT } = require("./api/gpt");
const { primbonCocokNamaPasangan, primbonArtiNama } = require("./api/primbon");
const { getPrimbonBisnis } = require("./api/primbon-bisnis");
const { tiktok, soundcloud } = require("./api/downloader");
const { downloadFacebook } = require("./api/facebook");
const { downloadInstagram } = require("./api/instagram");
const { downloadInstagramVideo } = require("./api/videoinstagram");
const { downloadSpotify } = require("./api/spotify");
const { downloadYouTubeMP4 } = require("./api/ytmp4");
const { downloadYouTubeMP3 } = require("./api/ytmp3");
const { downloadTwitterMedia } = require("./api/twitter");
const { getCaklontongQuestion } = require("./api/game"); // Tambahkan ini
const { getRandomQuotes } = require("./api/quotes");
const { getIPInfo } = require("./api/iplookup");
const { getGitHubProfile } = require("./api/github");
const { getSubdomains } = require("./api/subdomains");
const { getBeritaCNN } = require("./api/berita-cnn");
const { getBeritaKompas } = require("./api/berita-kompas");
const { getBeritaSido } = require("./api/berita-sidonews");
const { getBeritaBMKG } = require("./api/bmkg");
const { checkCuaca } = require("./api/cekcuaca");
const { searchStickerly } = require("./api/stickerly");
const { getJadwalSholat } = require("./api/jadwal-sholat");
const { generateQRCode } = require("./api/qrcode");
const { getTextToSpeech, getVoicesList } = require("./api/tts");
const { searchPddikti } = require("./api/pddikti");
const { searchKbbi } = require("./api/kbbi");
const { searchWikipedia } = require("./api/wikipedia");
const satpam = require("./lib/satpam");
const { generateGoodbyeV5 } = require("./lib/goodbye");

// Objek untuk menyimpan state game Caklontong yang sedang aktif per chat
const activeGames = {}; // Tambahkan ini
const sharp = require("sharp"); // Tambahkan ini

// Helper function untuk mengubah stream menjadi Buffer
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["SatpamBot", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      const qrcode = require("qrcode-terminal");
      qrcode.generate(qr, { small: true });
      console.log("Arahkan kamera WA ke QR di atas untuk login.");
    }
    if (connection === "close") {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("Koneksi terputus. Reconnect:", shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log(`✅ ${CONFIG.botName} berhasil terhubung!`);
    }
  });

  // Helper function untuk check apakah bot adalah admin di grup
  const isBotGroupAdmin = async (groupId) => {
    try {
      const groupMeta = await sock.groupMetadata(groupId);
      const botJid = sock.user.id;
      const isAdmin = groupMeta.participants.some(
        (p) => p.id === botJid && (p.admin || p.superAdmin),
      );
      return isAdmin;
    } catch (error) {
      console.error("Error checking bot admin status:", error);
      return false;
    }
  };

  // Helper function untuk menghapus pesan dengan retry
  const deleteMessageSafely = async (groupId, messageKey) => {
    try {
      await sock.sendMessage(groupId, { delete: messageKey });
      return true;
    } catch (error) {
      console.error("Error saat menghapus pesan:", error);
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        await sock.sendMessage(groupId, { delete: messageKey });
        return true;
      } catch (retryError) {
        console.error("Retry penghapusan pesan gagal:", retryError);
        return false;
      }
    }
  };

  // Ambil foto profil (user/grup) → Buffer; jika gagal kembalikan null
  async function getProfilePicBuffer(jid) {
    try {
      const url = await sock.profilePictureUrl(jid, "image");
      if (!url) return null;
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
      });
      return Buffer.from(res.data);
    } catch {
      return null;
    }
  }

  // Background default polos pakai sharp
  async function makeDefaultBG(
    width = 1024,
    height = 450,
    color = { r: 25, g: 30, b: 45 },
  ) {
    try {
      return await sharp({
        create: { width, height, channels: 3, background: color },
      })
        .jpeg({ quality: 92 })
        .toBuffer();
    } catch {
      return Buffer.alloc(0);
    }
  }

  // Helper function untuk kick member dengan pesan
  const kickMemberWithReason = async (
    groupId,
    memberJid,
    memberNumber,
    reason,
  ) => {
    try {
      // Cek apakah bot adalah admin di grup
      const botIsAdmin = await isBotGroupAdmin(groupId);
      if (!botIsAdmin) {
        console.warn(
          `[Kick] Bot bukan admin di grup ${groupId}, skip kick untuk ${memberNumber}`,
        );
        return false;
      }

      // Tunggu sebentar sebelum kick
      await new Promise((resolve) => setTimeout(resolve, 100));
      await sock.groupParticipantsUpdate(groupId, [memberJid], "remove");
      await sock.sendMessage(groupId, {
        text: reason,
        mentions: [memberJid],
      });
      return true;
    } catch (error) {
      console.error("Error saat kick member:", error);
      return false;
    }
  };

  // member left
  sock.ev.on("group-participants.update", async (ev) => {
    try {
      if (ev.action !== "remove") return;
      const groupId = ev.id;
      const groupMeta = await sock.groupMetadata(groupId).catch(() => null);
      const guildName = groupMeta?.subject || "Grup";
      const memberCount = groupMeta?.participants?.length || 1;

      // Background: foto grup → fallback polos
      const bgBuffer =
        (await getProfilePicBuffer(groupId)) || (await makeDefaultBG());

      for (const part of ev.participants || []) {
        const jid = typeof part === "string" ? part : part?.id; // ← ambil JID string
        if (!jid) continue;

        const number = formatNumber(jid) || "Member";

        const avatarBuffer =
          (await getProfilePicBuffer(jid)) ||
          (await makeDefaultBG(512, 512, { r: 60, g: 65, b: 80 }));

        let out = null;
        try {
          out = await generateGoodbyeV5({
            username: number,

            guildName,

            memberCount,

            quality: 90,

            background: bgBuffer,

            avatar: avatarBuffer,
          });
        } catch (e) {
          console.error("Generate goodbye failed:", e?.message || e);
        }

        if (out && Buffer.isBuffer(out)) {
          await sock.sendMessage(groupId, {
            image: out,
            caption: `👋 Selamat jalan, @${number}!`,

            mentions: [jid],
          });
        } else {
          await sock.sendMessage(groupId, {
            text: `👋 Selamat jalan, @${number}!`,
            mentions: [jid],
          });
        }
      }
    } catch (e) {
      console.error("Auto Goodbye Error:", e);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      const senderJid = isGroup ? msg.key.participant : from;
      const senderNumber = resolveSenderToNumber(senderJid);

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      // ─── SATPAM GRUP ─────────────────────────────────────────
      if (isGroup) {
        try {
          const groupMeta = await sock.groupMetadata(from);
          const groupAdmins = groupMeta.participants
            .filter((p) => p.admin)
            .map((p) => resolveSenderToNumber(p.id));

          const isGroupAdmin = groupAdmins.includes(senderNumber);
          const isBotAdmin = db.isAdmin(senderNumber);

          if (!isBotAdmin && !isGroupAdmin && satpam.containsJailbreak(text)) {
            // Hapus pesan
            await deleteMessageSafely(from, msg.key);
            // Kick member (dengan pengecekan bot admin)
            await kickMemberWithReason(
              from,
              senderJid,
              senderNumber,
              `🚫 @${senderNumber} di-kick: dilarang promosi jailbreak/Mod WA.`,
            );
            continue;
          }

          if (
            !isBotAdmin &&
            !isGroupAdmin &&
            satpam.isSpam(from, senderJid, text)
          ) {
            // Hapus pesan
            await deleteMessageSafely(from, msg.key);
            // Kick member (dengan pengecekan bot admin)
            await kickMemberWithReason(
              from,
              senderJid,
              senderNumber,
              `🚫 @${senderNumber} di-kick: spam terdeteksi.`,
            );
            continue;
          }

          if (!isBotAdmin && !isGroupAdmin && satpam.hasInvisibleAbuse(text)) {
            // Hapus pesan
            await deleteMessageSafely(from, msg.key);
            // Kick member (dengan pengecekan bot admin)
            await kickMemberWithReason(
              from,
              senderJid,
              senderNumber,
              `🚫 @${senderNumber} di-kick: penggunaan karakter invis tidak diperbolehkan.`,
            );
            continue;
          }

          if (
            !isBotAdmin &&
            !isGroupAdmin &&
            satpam.containsGroupOrChannelLink(text)
          ) {
            // Hapus pesan terlebih dahulu
            await deleteMessageSafely(from, msg.key);

            const warnCount = db.getLinkWarningCount(from, senderNumber);
            if (warnCount >= 2) {
              // Kick setelah peringatan 2x
              db.clearLinkWarning(from, senderNumber);
              await kickMemberWithReason(
                from,
                senderJid,
                senderNumber,
                `🚫 @${senderNumber} di-kick: masih menyebar link grup/saluran/URL tanpa izin admin setelah 2x peringatan.`,
              );
            } else {
              // Berikan peringatan
              db.addLinkWarning(from, senderNumber);
              await sock.sendMessage(from, {
                text: `⚠️ @${senderNumber} *Peringatan ${warnCount + 1}:* Dilarang mengirim link, URL, grup, atau saluran WA tanpa izin admin. Peringatan 3x = kick!`,
                mentions: [senderJid],
              });
            }
            continue;
          }

          if (!isBotAdmin && !isGroupAdmin && satpam.containsToxic(text)) {
            await sock.sendMessage(from, { delete: msg.key });
            await sock.sendMessage(from, {
              text: `⚠️ Pesan @${senderNumber} dihapus: mengandung kata tidak pantas.`,
              mentions: [senderJid],
            });
            continue;
          }

          if (!isBotAdmin && !isGroupAdmin && satpam.containsPromo(text)) {
            // Hapus pesan
            await deleteMessageSafely(from, msg.key);

            const warnCount = db.getLinkWarningCount(from, senderNumber);
            if (warnCount >= 2) {
              // Kick setelah peringatan 2x
              db.clearLinkWarning(from, senderNumber);
              await kickMemberWithReason(
                from,
                senderJid,
                senderNumber,
                `🚫 @${senderNumber} di-kick: masih melakukan promosi tanpa izin admin setelah 2x peringatan.`,
              );
            } else {
              // Berikan peringatan
              db.addLinkWarning(from, senderNumber);
              await sock.sendMessage(from, {
                text: `⚠️ @${senderNumber} *Peringatan ${warnCount + 1}:* Dilarang promosi di grup ini tanpa izin admin. Peringatan 3x = kick!`,
                mentions: [senderJid],
              });
            }
            continue;
          }
        } catch (error) {
          console.error("Error dalam satpam enforcement:", error);
          // Jangan stop processing, lanjutkan ke command handling
        }
      }

      // ─── PERINTAH (command) ──────────────────────────────────
      if (!text.startsWith(CONFIG.prefix)) continue;

      const args = text.slice(CONFIG.prefix.length).trim().split(/\s+/);
      const command = args.shift().toLowerCase();

      const reply = (txt) =>
        sock.sendMessage(from, { text: txt }, { quoted: msg });

      if (command === "menu" || command === "help") {
        await reply(
          `🛡️ *${CONFIG.botName}*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🤖 *AI Assistant*\n` +
            `> ${CONFIG.prefix}gpt _(pertanyaan)_\n` +
            `> ${CONFIG.prefix}duckai _(pertanyaan)_\n` +
            `> ${CONFIG.prefix}muslimai _(pertanyaan)_\n` +
            `> ${CONFIG.prefix}arona _(pertanyaan)_\n\n` +
            `📋 *Umum*\n` +
            `> ${CONFIG.prefix}menu\n` +
            `> ${CONFIG.prefix}profile\n\n` +
            `📃 *Ilmu*\\n` +
            `> ${CONFIG.prefix}kbbi _(kata)_\\n` +
            `> ${CONFIG.prefix}wikipedia _(kata kunci)_\n\n` +
            `💪 *Motivasi*\n` +
            `> ${CONFIG.prefix}quotes\n\n` +
            `📰 *Berita*\n` +
            `> ${CONFIG.prefix}berita-cnn\n` +
            `> ${CONFIG.prefix}berita-kompas\n` +
            `> ${CONFIG.prefix}berita-sidonews\n` +
            `> ${CONFIG.prefix}bmkg\n` +
            `> ${CONFIG.prefix}cekcuaca _(kota)_\n\n` +
            `🎮 *Game*\n` +
            `> ${CONFIG.prefix}caklontong\n` +
            `> ${CONFIG.prefix}nyerah\n\n` +
            `💾 *Downloader*\n` +
            `> ${CONFIG.prefix}tiktok _(link)_\n` +
            `> ${CONFIG.prefix}facebook _(link)_\n` +
            `> ${CONFIG.prefix}fotoinstagram _(link)_\n` +
            `> ${CONFIG.prefix}reels _(link)_\n` +
            `> ${CONFIG.prefix}soundcloud _(link)_\n` +
            `> ${CONFIG.prefix}spotify _(link)_\n` +
            `> ${CONFIG.prefix}ytmp4 _(link)_\n` +
            `> ${CONFIG.prefix}ytmp3 _(link)_\n` +
            `> ${CONFIG.prefix}twitter _(link)_\n\n` +
            `🛠️ *Tools*\n` +
            `> ${CONFIG.prefix}stiker _(kirim/reply gambar)_\n` +
            `> ${CONFIG.prefix}stickerly _(nama stiker)_\n` +
            `> ${CONFIG.prefix}qrcode _(text)_\n` +
            `> ${CONFIG.prefix}tts _(text)_\n\n` +
            `🔮 *Primbon*\n` +
            `> ${CONFIG.prefix}cocok _(nama + nama)_\n` +
            `> ${CONFIG.prefix}artinama _(nama)_\n` +
            `> ${CONFIG.prefix}bisnismu _(tgl bln thn)_\n\n` +
            `🕌 *Jadwal Sholat*\n` +
            `> ${CONFIG.prefix}sholat _(kota)_\n\n` +
            `🔍 *Stalk*\n` +
            `> ${CONFIG.prefix}iplookup _(IP address)_\n` +
            `> ${CONFIG.prefix}github _(username)_\n` +
            `> ${CONFIG.prefix}pddikti _(nama/nim)_\n` +
            `> ${CONFIG.prefix}subdomains _(domain)_\n\n` +
            `👑 *Admin Bot*\n` +
            `> ${CONFIG.prefix}addadmin _(nomor)_\n` +
            `> ${CONFIG.prefix}deladmin _(nomor)_\n` +
            `> ${CONFIG.prefix}listadmin\n` +
            `> ${CONFIG.prefix}kick _@tag_\n\n` +
            `🤖 *Satpam Otomatis*\n` +
            `> Link WA — peringatan 2x lalu kick\n` +
            `> Kata toxic — pesan dihapus\n` +
            `> Promosi — peringatan 2x lalu kick\n` +
            `> Spam/Jailbreak/Invis — langsung kick\n\n` +
            `💰 *Donasi*\n` +
            `> ${CONFIG.prefix}donasi _(info donasi)_\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✨ _Powered by Wira_`,
        );
        continue;
      }

      if (command === "gpt") {
        const prompt = args.join(" ");
        if (!prompt) {
          await reply(
            "❓ Tulis pertanyaan kamu setelah !gpt\nContoh: !gpt Apa itu Indonesia?",
          );
          continue;
        }
        await reply("⏳ Sedang menghubungi GPT AI...");
        const result = await askGPT(prompt);

        if (result.error) {
          await reply(`❌ ${result.error}`);
          continue;
        }

        await reply(`🤖 *GPT AI:*\n\n${result.answer}`);
        continue;
      }

      if (command === "duckai") {
        const prompt = args.join(" ");
        if (!prompt) {
          await reply(
            "❓ Tulis pertanyaan kamu setelah !duckai\nContoh: !duckai Apa itu Indonesia?",
          );
          continue;
        }
        await reply("⏳ Sedang menghubungi DuckAI...");
        const answer = await askDuckAI(prompt);
        const out = typeof answer === "string" ? answer : String(answer);
        await reply(`🤖 *DuckAI:*\n\n${out}`);
        continue;
      }

      if (command === "muslimai") {
        const prompt = args.join(" ");
        if (!prompt) {
          await reply(
            "❓ Tulis pertanyaan kamu setelah !muslimai\nContoh: !muslimai Siapa nama mu?",
          );
          continue;
        }
        await reply("⏳ Sedang menghubungi Muslim AI...");
        const answer = await askMuslimAI(prompt);
        const out = typeof answer === "string" ? answer : String(answer);
        await reply(`☪️ *Muslim AI:*\n\n${out}`);
        continue;
      }

      if (command === "arona") {
        const prompt = args.join(" ");
        if (!prompt) {
          await reply(
            "❓ Tulis pertanyaan kamu setelah !arona\nContoh: !arona Siapa nama mu?",
          );
          continue;
        }
        await reply("⏳ Sedang menghubungi Arona...");
        const answer = await askArona(prompt);
        const out = typeof answer === "string" ? answer : String(answer);
        await reply(`✨ *Arona:*\n\n${out}`);
        continue;
      }

      if (command === "quotes") {
        await reply("⏳ Sedang mengambil quotes inspiratif...");
        const quoteResult = await getRandomQuotes();

        if (quoteResult.error) {
          await reply(quoteResult.error);
          continue;
        }

        await reply(
          `✨ *Quote of the Day*\n\n` +
            `"${quoteResult.quote}"\n\n` +
            `— ${quoteResult.author}`,
        );
        continue;
      }

      if (command === "profile") {
        await reply(
          `Halo, perkenalkan saya adalah Mohamad Zaelani Wira Kusuma seseorang yang entah kenapa nyasar ke jurusan IT, padahal kemampuan saya juga masih sangat dipertanyakan.

Saya katanya bisa Full-Stack Developer dan Mobile Developer, tapi jujur saja dari front-end, back-end, sampai mobile itu semua masih level coba-coba dan berharap tidak error. Kalau pun jadi, ya mungkin cuma keberuntungan semata.

Saya mengaku "passion" di web dan mobile development, padahal kenyataannya lebih sering bengong depan layar sambil bingung kenapa kode tidak mau jalan. AI sudah seperti dosen pembimbing kedua buat saya.

Katanya sih saya "semangat belajar teknologi baru", tapi realitanya setiap kali lihat teknologi baru langsung pusing tujuh keliling dan ujung-ujungnya balik ke yang lama juga.

Sekarang lagi sibuk kuliah sambil bikin portofolio, yang mana isi portofolionya pun masih proyek-proyek yang belum tentu ada yang mau pakai. Tapi tetap diupload biar kelihatan aktif.

Info kontak: 083841407959 (WA). Kalau bot error atau mau tanya-tanya, silakan hubungi. Terima kasih.`,
        );
        continue;
      }

      if (command === "pddikti") {
        const query = args.join(" ");
        if (!query) {
          await reply(`❌ Gunakan: ${CONFIG.prefix}pddikti [nama/nim]`);
          continue;
        }
        await reply("⏳ Sedang mencari data di PDDIKTI...");
        const result = await searchPddikti(query);
        await reply(result);
        continue;
      }

      if (command === "kbbi") {
        const query = args.join(" ");
        if (!query) {
          await reply(`❌ Gunakan: ${CONFIG.prefix}kbbi [kata]`);
          continue;
        }
        await reply("⏳ Sedang mencari definisi di KBBI...");
        const result = await searchKbbi(query);
        await reply(result);
        continue;
      }

      if (command === "wikipedia") {
        const query = args.join(" ");
        if (!query) {
          await reply(
            `❓ Gunakan: ${CONFIG.prefix}wikipedia [kata kunci]\\nContoh: ${CONFIG.prefix}wikipedia apa itu sawit`,
          );
          continue;
        }
        await reply("⏳ Sedang mencari informasi di Wikipedia...");
        const result = await searchWikipedia(query);
        await reply(result);
        continue;
      }

      if (command === "berita-sidonews") {
        await reply("⏳ Sedang mengambil berita Sido News...");

        try {
          const beritaList = await getBeritaSido();

          if (!beritaList || beritaList.length === 0) {
            await reply("❌ Gagal mengambil berita. Silahkan coba lagi.");
            continue;
          }

          let message = `🗣️ *BERITA Sidonews*\n\n`;

          // Ambil 5 berita terbaru
          beritaList.slice(0, 5).forEach((berita, index) => {
            const title = berita.title.replace(/\n\s+/g, " ").trim();
            message += `${index + 1}. ${title}\n→ ${berita.url}\n\n`;
          });

          await reply(message);
        } catch (err) {
          console.error("Berita Sidonews Error:", err);
          await reply(`❌ ${err.message}`);
        }
        continue;
      }

      if (command === "berita-cnn") {
        await reply("⏳ Sedang mengambil berita CNN Indonesia...");

        try {
          const beritaList = await getBeritaCNN();

          if (!beritaList || beritaList.length === 0) {
            await reply("❌ Gagal mengambil berita. Silahkan coba lagi.");
            continue;
          }

          let message = `🗣️ *BERITA CNN INDONESIA*\n\n`;

          // Ambil 5 berita terbaru
          beritaList.slice(0, 5).forEach((berita, index) => {
            const title = berita.title.replace(/\n\s+/g, " ").trim();
            message += `${index + 1}. ${title}\n→ ${berita.url}\n\n`;
          });

          await reply(message);
        } catch (err) {
          console.error("Berita CNN Error:", err);
          await reply(`❌ ${err.message}`);
        }
        continue;
      }

      if (command === "berita-kompas") {
        await reply("⏳ Sedang mengambil berita Kompas...");

        try {
          const beritaList = await getBeritaKompas();

          if (!beritaList || beritaList.length === 0) {
            await reply("❌ Gagal mengambil berita. Silahkan coba lagi.");
          } else {
            let message = `📰 *BERITA KOMPAS TERBARU*\n\n`;
            beritaList.slice(0, 5).forEach((berita, index) => {
              const title = (berita.title || "").replace(/\n\s+/g, " ").trim();
              const url = berita.url || berita.link || "-";
              message += `${index + 1}. ${title}\n→ ${url}\n\n`;
            });
            await reply(message);
          }
        } catch (err) {
          console.error("Berita Kompas Error:", err);
          await reply(`❌ ${err.message}`);
        }
        continue;
      }

      if (command === "bmkg") {
        await reply("⏳ Sedang mengambil data gempa BMKG...");

        try {
          const gempaData = await getBeritaBMKG();

          if (!gempaData || !gempaData.dirasakan) {
            await reply("❌ Gagal mengambil data gempa. Silahkan coba lagi.");
            continue;
          }

          let message = `😱 *INFORMASI GEMPA - BMKG*\n\n`;

          // Ambil 5 gempa yang paling baru dirasakan
          gempaData.dirasakan.slice(0, 5).forEach((gempa, index) => {
            message += `*${index + 1}. ${gempa.Tanggal} - ${gempa.Jam}*\n`;
            message += `📍 Magnitudo: ${gempa.Magnitude}\n`;
            message += `📍 Kedalaman: ${gempa.Kedalaman}\n`;
            message += `📍 Wilayah: ${gempa.Wilayah}\n`;
            message += `📍 Dirasakan: ${gempa.Dirasakan}\n\n`;
          });

          await reply(message);
        } catch (err) {
          console.error("BMKG Error:", err);
          await reply(`❌ ${err.message}`);
        }
        continue;
      }

      if (command === "cekcuaca") {
        const kota = args.join(" ").trim();
        if (!kota) {
          await reply(
            `❓ Format: ${CONFIG.prefix}cekcuaca <kota>\nContoh: ${CONFIG.prefix}cekcuaca Jakarta`,
          );
          continue;
        }

        await reply("⏳ Sedang mengecek cuaca...");

        try {
          const cuacaData = await checkCuaca(kota);

          if (!cuacaData) {
            await reply(
              `❌ Kota "${kota}" tidak ditemukan atau terjadi kesalahan.`,
            );
            continue;
          }

          let message = `🌤️ *INFORMASI CUACA*\n\n`;
          message += `📍 *Lokasi:* ${cuacaData.lokasi}\n`;
          message += `☁️ *Kondisi:* ${cuacaData.kondisi}\n`;
          message += `🌡️ *Suhu:* ${cuacaData.suhu}\n`;
          message += `💧 *Kelembaban:* ${cuacaData.kelembaban}\n`;
          message += `💨 *Angin:* ${cuacaData.angin}`;

          await reply(message);
        } catch (err) {
          console.error("Cek Cuaca Error:", err);
          await reply(`❌ ${err.message}`);
        }
        continue;
      }

      if (command === "iplookup") {
        const ipAddress = args.join(" ").trim();
        if (!ipAddress) {
          await reply(
            `❓ Format: ${CONFIG.prefix}iplookup <IP>\nContoh: ${CONFIG.prefix}iplookup 118.96.203.38`,
          );
          continue;
        }

        await reply("⏳ Sedang mencari informasi IP address...");
        const ipResult = await getIPInfo(ipAddress);

        if (ipResult.error) {
          await reply(ipResult.error);
          continue;
        }

        const data = ipResult.data;
        await reply(
          `🔍 *IP Lookup Result*\n\n` +
            `📍 IP Address: \`${data.ip}\`\n` +
            `🏠 Hostname: ${data.hostname}\n` +
            `🏙️ City: ${data.city}\n` +
            `🗺️ Region: ${data.region}\n` +
            `🌍 Country: ${data.country}\n` +
            `📬 Postal: ${data.postal_code}\n` +
            `📌 Latitude: ${data.latitude}\n` +
            `📌 Longitude: ${data.longitude}\n` +
            `🏢 Organization: ${data.organization}\n` +
            `⏰ Timezone: ${data.timezone}`,
        );
        continue;
      }

      if (command === "github") {
        const githubUsername = args.join(" ").trim();
        if (!githubUsername) {
          await reply(
            `❓ Format: ${CONFIG.prefix}github <username>\nContoh: ${CONFIG.prefix}github wira09`,
          );
          continue;
        }

        await reply("⏳ Sedang mencari profil GitHub...");
        const ghResult = await getGitHubProfile(githubUsername);

        if (ghResult.error) {
          await reply(ghResult.error);
          continue;
        }

        const gh = ghResult.data;
        let message = `👤 *GitHub Profile*\n\n`;
        message += `🔗 Username: @${gh.username}\n`;
        message += `📝 Nickname: ${gh.nickname}\n`;
        message += `📄 Bio: ${gh.bio}\n`;
        message += `🆔 User ID: ${gh.id}\n`;
        message += `🏢 Company: ${gh.company}\n`;
        message += `🏠 Blog: ${gh.blog}\n`;
        message += `📍 Location: ${gh.location}\n`;
        message += `💼 Email: ${gh.email}\n`;
        message += `📅 Member since: ${gh.createdAt.split("T")[0]}\n`;
        message += `🔄 Last updated: ${gh.updatedAt.split("T")[0]}\n\n`;
        message += `📊 *Statistik:*\n`;
        message += `📦 Public Repos: ${gh.publicRepo}\n`;
        message += `📋 Public Gists: ${gh.publicGists}\n`;
        message += `👥 Followers: ${gh.followers}\n`;
        message += `🔗 Following: ${gh.following}\n\n`;
        message += `🔗 Link: ${gh.url}`;

        await reply(message);
        continue;
      }

      if (command === "subdomains") {
        const targetDomain = args.join(" ").trim();
        if (!targetDomain) {
          await reply(
            `❓ Format: ${CONFIG.prefix}subdomains <domain>\nContoh: ${CONFIG.prefix}subdomains siputzx.my.id`,
          );
          continue;
        }

        await reply("⏳ Sedang mencari subdomain...");
        const subResult = await getSubdomains(targetDomain);

        if (subResult.error) {
          await reply(subResult.error);
          continue;
        }

        const subs = subResult.data;
        let message = `🔗 *Subdomain Lookup*\n\n`;
        message += `📍 Domain: ${subs.domain}\n`;
        message += `📊 Total: ${subs.count} subdomain(s)\n`;
        message += `⏰ Waktu: ${new Date(subs.timestamp).toLocaleString("id-ID")}\n\n`;
        message += `📋 *Daftar Subdomain:*\n`;

        // Batasi display ke 50 subdomain pertama untuk tidak membuat pesan terlalu panjang
        const displaySubs = subs.subdomains.slice(0, 50);
        displaySubs.forEach((sub, idx) => {
          message += `${idx + 1}. ${sub}\n`;
        });

        if (subs.count > 50) {
          message += `\n... dan ${subs.count - 50} subdomain lainnya`;
        }

        await reply(message);
        continue;
      }

      if (command === "cocok") {
        const joined = args.join(" ");
        const parts = joined
          .split("+")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length < 2) {
          await reply(
            "❓ Format: !cocok nama_kamu + nama_pasangan\nContoh: !cocok Susi + Bayu",
          );
          continue;
        }
        const nama1 = parts[0];
        const nama2 = parts.slice(1).join(" ");
        await reply("⏳ Sedang menghitung kecocokan nama...");
        const hasil = await primbonCocokNamaPasangan(nama1, nama2);
        await reply(hasil);
        continue;
      }

      if (command === "artinama") {
        const nama = args.join(" ").trim();
        if (!nama) {
          await reply(
            "❓ Format: !artinama Nama Lengkap\nContoh: !artinama Mohamad Zaelani Wira Kusuma",
          );
          continue;
        }
        await reply("⏳ Sedang mencari arti nama...");
        const hasil = await primbonArtiNama(nama);
        await reply(hasil);
        continue;
      }

      if (command === "bisnismu") {
        const tanggal = args[0];
        const bulan = args[1];
        const tahun = args[2];

        if (!tanggal || !bulan || !tahun) {
          await reply(
            `❓ Format: ${CONFIG.prefix}bisnismu <tanggal> <bulan> <tahun>\n` +
              `Contoh: ${CONFIG.prefix}bisnismu 1 1 2000\n\n` +
              `📅 Tanggal: 1-31\n` +
              `📅 Bulan: 1-12\n` +
              `📅 Tahun: 1900-${new Date().getFullYear()}`,
          );
          continue;
        }

        await reply("⏳ Sedang menganalisis sifat bisnis kamu...");
        const bisnisResult = await getPrimbonBisnis(tanggal, bulan, tahun);

        if (bisnisResult.error) {
          await reply(bisnisResult.error);
          continue;
        }

        const bisnis = bisnisResult.data;
        let message = `💼 *Sifat Bisnis Anda*\n\n`;
        message += `📅 ${bisnis.hariLahir}\n\n`;
        message += `📝 *Sifat Usaha:*\n${bisnis.usaha}\n\n`;
        message += `💡 *Catatan:*\n${bisnis.catatan}`;

        await reply(message);
        continue;
      }

      if (command === "sholat") {
        const kota = args.join(" ").trim();

        if (!kota) {
          await reply(
            `❓ Format: ${CONFIG.prefix}sholat <kota>\n` +
              `Contoh: ${CONFIG.prefix}sholat Bandung\n` +
              `Atau: ${CONFIG.prefix}sholat Jakarta`,
          );
          continue;
        }

        await reply("⏳ Sedang mengambil jadwal sholat...");
        const sholatResult = await getJadwalSholat(kota);

        if (sholatResult.error) {
          await reply(sholatResult.error);
          continue;
        }

        const sholat = sholatResult.data;
        let message = `🕌 *Jadwal Sholat*\n`;
        message += `🏙️ ${sholat.kota}\n`;
        message += `📅 ${sholat.tanggal}\n\n`;
        message += `📍 *Waktu Sholat:*\n`;
        message += `🌙 Imsak: ${sholat.imsak}\n`;
        message += `🌅 Subuh: ${sholat.subuh}\n`;
        message += `☀️ Terbit: ${sholat.terbit}\n`;
        message += `🌞 Dzuhur: ${sholat.dzuhur}\n`;
        message += `📖 Ashar: ${sholat.ashar}\n`;
        message += `🌅 Maghrib: ${sholat.maghrib}\n`;
        message += `🌙 Isya: ${sholat.isya}\n`;
        message += `⏰ Tengah Malam: ${sholat.tengahMalam}\n\n`;
        message += `💡 *Catatan:*\n${sholat.catatan}`;

        await reply(message);
        continue;
      }

      if (command === "tiktok") {
        const url = args.join(" ").trim();
        if (!url) {
          await reply(
            "❓ Format: !tiktok <url>\nContoh: !tiktok https://vt.tiktok.com/ZSjXNEnbC/",
          );
          continue;
        }

        await reply("⏳ Sedang mengambil video TikTok...");
        const hasil = await tiktok(url);

        if (hasil.error) {
          await reply(hasil.error);
          continue;
        }

        await sock.sendMessage(
          msg.key.remoteJid,
          {
            video: hasil.buffer,
            caption:
              `🎵 *${hasil.title}*\n` +
              `👤 ${hasil.author}\n` +
              `❤️ ${hasil.likes}  👁️ ${hasil.views}`,
            mimetype: "video/mp4",
          },
          { quoted: msg },
        );

        continue;
      }

      if (command === "soundcloud") {
        const url = args.join(" ").trim();
        if (!url) {
          await reply(
            "❓ Format: !soundcloud <url>\nContoh: !soundcloud https://m.soundcloud.com/teguh-hariyadi-652597010/anji-dia",
          );
          continue;
        }

        await reply("⏳ Sedang mengambil lagu...");
        const hasil = await soundcloud(url);

        if (hasil.error) {
          await reply(hasil.error);
          continue;
        }

        // Kirim sebagai audio langsung
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            audio: { url: hasil.audioUrl },
            mimetype: "audio/mp4",
            ptt: false, // false = musik, true = voice note
          },
          { quoted: msg },
        );

        await reply(`🎵 *${hasil.title}*\n👤 ${hasil.author}`);
        continue;
      }

      if (command === "spotify") {
        const url = args.join(" ").trim();
        if (!url) {
          await reply(
            "❓ Format: !spotify <url>\nContoh: !spotify https://open.spotify.com/track/0Y0xIGcTjb5EFHHYrJIGIk",
          );
          continue;
        }

        if (!url.includes("spotify.com")) {
          await reply("❌ Pastikan URL adalah link Spotify yang valid.");
          continue;
        }

        await reply("⏳ Sedang mengambil lagu Spotify...");
        const hasil = await downloadSpotify(url);

        if (!hasil.status) {
          await reply(`❌ ${hasil.error}`);
          continue;
        }

        try {
          // Kirim audio
          if (hasil.downloadUrl) {
            await sock.sendMessage(
              msg.key.remoteJid,
              {
                audio: { url: hasil.downloadUrl },
                mimetype: "audio/mp4",
                ptt: false,
              },
              { quoted: msg },
            );
          }

          // Kirim info lagu
          let infoMsg = `🎵 *${hasil.title}*\n`;
          infoMsg += `🎤 Artis: ${hasil.artist}\n`;
          infoMsg += `💿 Album: ${hasil.album}\n`;
          infoMsg += `📅 Rilis: ${hasil.releaseDate}\n`;
          infoMsg += `⏱️ Durasi: ${(hasil.duration / 1000 / 60).toFixed(2)} menit\n`;
          infoMsg += `📦 Ukuran: ${(hasil.size / 1024 / 1024).toFixed(2)} MB`;

          if (hasil.image) {
            await sock.sendMessage(
              msg.key.remoteJid,
              {
                image: { url: hasil.image },
                caption: infoMsg,
              },
              { quoted: msg },
            );
          } else {
            await reply(infoMsg);
          }
        } catch (error) {
          console.error("Error sending Spotify download:", error);
          await reply("❌ Gagal mengirim lagu. Silahkan coba lagi nanti.");
        }
        continue;
      }

      if (command === "ytmp4") {
        const url = args.join(" ").trim();
        if (!url) {
          await reply(
            "❓ Format: !ytmp4 <url>\nContoh: !ytmp4 https://youtu.be/dQw4w9WgXcQ",
          );
          continue;
        }

        if (!url.includes("youtu")) {
          await reply("❌ Pastikan URL adalah link YouTube yang valid.");
          continue;
        }

        await reply("⏳ Sedang mengunduh video YouTube...");

        try {
          const videoData = await downloadYouTubeMP4(url);

          if (!videoData) {
            await reply("❌ Gagal mengunduh video. Silahkan coba lagi.");
            continue;
          }

          let infoMsg = `🎬 *${videoData.title}*\n`;
          infoMsg += `⏱️ Durasi: ${videoData.duration}\n`;
          infoMsg += `🎥 Kualitas: ${videoData.quality || "FHD"}\n`;
          infoMsg += `📦 Ukuran: ${videoData.fileSize || "unknown"}\n\n`;
          infoMsg += `🔗 Link Download: ${videoData.download}`;

          if (videoData.thumbnail) {
            await sock.sendMessage(
              msg.key.remoteJid,
              {
                image: { url: videoData.thumbnail },
                caption: infoMsg,
              },
              { quoted: msg },
            );
          } else {
            await reply(infoMsg);
          }
        } catch (err) {
          console.error("YouTube MP4 Error:", err);
          await reply(`❌ ${err.message}`);
        }
        continue;
      }

      if (command === "ytmp3") {
        const url = args.join(" ").trim();
        if (!url) {
          await reply(
            "❓ Format: !ytmp3 <url>\nContoh: !ytmp3 https://youtu.be/dQw4w9WgXcQ",
          );
          continue;
        }

        if (!url.includes("youtu")) {
          await reply("❌ Pastikan URL adalah link YouTube yang valid.");
          continue;
        }

        await reply("⏳ Sedang mengunduh audio YouTube...");

        try {
          const audioData = await downloadYouTubeMP3(url);

          if (!audioData) {
            await reply("❌ Gagal mengunduh audio. Silahkan coba lagi.");
            continue;
          }

          let infoMsg = `🎵 *${audioData.title}*\n`;
          infoMsg += `⏱️ Durasi: ${audioData.duration}\n`;
          infoMsg += `🔊 Kualitas: ${audioData.quality || "48K"}\n`;
          infoMsg += `📦 Ukuran: ${audioData.fileSize || "unknown"}\n\n`;
          infoMsg += `🔗 Link Download: ${audioData.download}`;

          if (audioData.thumbnail) {
            await sock.sendMessage(
              msg.key.remoteJid,
              {
                image: { url: audioData.thumbnail },
                caption: infoMsg,
              },
              { quoted: msg },
            );
          } else {
            await reply(infoMsg);
          }
        } catch (err) {
          console.error("YouTube MP3 Error:", err);
          await reply(`❌ ${err.message}`);
        }
        continue;
      }

      if (command === "twitter") {
        const url = args.join(" ").trim();
        if (!url) {
          await reply(
            "❓ Format: !twitter <url>\nContoh: !twitter https://x.com/username/status/123456",
          );
          continue;
        }

        if (!url.includes("twitter.com") && !url.includes("x.com")) {
          await reply("❌ Pastikan URL adalah link Twitter/X yang valid.");
          continue;
        }

        await reply("⏳ Sedang mengunduh media Twitter...");

        try {
          const mediaData = await downloadTwitterMedia(url);

          if (!mediaData) {
            await reply("❌ Gagal mengunduh media. Silahkan coba lagi.");
            continue;
          }

          let infoMsg = `🐦 *${mediaData.videoTitle}*\n\n`;
          infoMsg += `📝 ${mediaData.videoDescription}\n\n`;
          infoMsg += `🔗 Link Download: ${mediaData.downloadLink}`;

          if (mediaData.imgUrl) {
            await sock.sendMessage(
              msg.key.remoteJid,
              {
                image: { url: mediaData.imgUrl },
                caption: infoMsg,
              },
              { quoted: msg },
            );
          } else {
            await reply(infoMsg);
          }
        } catch (err) {
          console.error("Twitter Download Error:", err);
          await reply(`❌ ${err.message}`);
        }
        continue;
      }

      if (command === "facebook" || command === "fb") {
        const url = args.join(" ").trim();
        if (!url) {
          await reply(
            "❓ Format: !facebook <url>\nContoh: !facebook https://www.facebook.com/share/v/1DVCxz3QVM/",
          );
          continue;
        }

        if (!url.includes("facebook.com")) {
          await reply("❌ Pastikan URL adalah link Facebook yang valid.");
          continue;
        }

        await reply("⏳ Sedang mengambil video Facebook...");
        const hasil = await downloadFacebook(url);

        if (hasil.error) {
          await reply(hasil.error);
          continue;
        }

        try {
          let message = `🎬 *${hasil.title}*\n`;
          message += `⏱️ Durasi: ${hasil.duration}\n`;
          message += `📊 Kualitas: ${hasil.quality}`;

          await sock.sendMessage(
            msg.key.remoteJid,
            {
              video: { url: hasil.videoUrl },
              caption: message,
              mimetype: "video/mp4",
            },
            { quoted: msg },
          );
        } catch (error) {
          console.error("Error sending Facebook video:", error);
          await reply(
            "❌ Gagal mengirim video. File mungkin terlalu besar atau link sudah expired.",
          );
        }
        continue;
      }

      if (command === "fotoinstagram" || command === "ig") {
        const url = args.join(" ").trim();
        if (!url) {
          await reply(
            "❓ Format: !fotoinstagram <url>\nContoh: !instagram https://www.instagram.com/reel/DXFpq0GE2ve/",
          );
          continue;
        }

        if (!url.includes("instagram.com")) {
          await reply("❌ Pastikan URL adalah link Instagram yang valid.");
          continue;
        }

        await reply("⏳ Sedang mengambil konten Instagram...");
        const hasil = await downloadInstagram(url);

        if (hasil.error) {
          await reply(hasil.error);
          continue;
        }

        try {
          let message = `📸 *${hasil.caption}*`;

          if (hasil.author) {
            message += `\n👤 @${hasil.author}`;
          }

          if (hasil.totalMedia > 1) {
            message += `\n📷 ${hasil.totalMedia} item(s)`;
          }

          message += `\n⏱️ ${hasil.mediaType === "video" ? "🎬 Video" : "🖼️ Foto"}`;

          if (hasil.mediaType === "video") {
            // Kirim video via URL langsung (seperti Facebook)
            console.log("[Instagram] Sending video via URL:", hasil.mediaUrl);
            await sock.sendMessage(
              msg.key.remoteJid,
              {
                video: { url: hasil.mediaUrl },
                caption: message,
                mimetype: "video/mp4",
              },
              { quoted: msg },
            );
          } else {
            // Kirim image via URL
            console.log("[Instagram] Sending image via URL:", hasil.mediaUrl);
            await sock.sendMessage(
              msg.key.remoteJid,
              {
                image: { url: hasil.mediaUrl },
                caption: message,
                mimetype: "image/jpeg",
              },
              { quoted: msg },
            );
          }
        } catch (error) {
          console.error("Error sending Instagram media:", error);
          await reply(
            "❌ Gagal mengirim media. Coba lagi dalam beberapa saat atau gunakan link Instagram yang berbeda.",
          );
        }
        continue;
      }

      if (command === "reels" || command === "igvideo") {
        const url = args.join(" ").trim();
        if (!url) {
          await reply(
            "❓ Format: !reels <url>\nContoh: !reels https://www.instagram.com/reel/DXFss0HE_mG/",
          );
          continue;
        }

        if (!url.includes("instagram.com")) {
          await reply("❌ Pastikan URL adalah link Instagram yang valid.");
          continue;
        }

        await reply("⏳ Sedang mengambil video Instagram Reels...");
        const hasil = await downloadInstagramVideo(url);

        if (hasil.error) {
          await reply(hasil.error);
          continue;
        }

        try {
          let message = `🎬 *${hasil.caption}*\n`;

          if (hasil.author) {
            message += `👤 @${hasil.author}\n`;
          }

          message += `❤️ ${hasil.likes} likes`;
          if (hasil.comments > 0) {
            message += ` • 💬 ${hasil.comments} comments`;
          }

          await sock.sendMessage(
            msg.key.remoteJid,
            {
              video: { url: hasil.videoUrl },
              caption: message,
              mimetype: "video/mp4",
            },
            { quoted: msg },
          );
        } catch (error) {
          console.error("Error sending Instagram Reels:", error);
          await reply(
            "❌ Gagal mengirim video. Coba lagi dalam beberapa saat atau gunakan link Reels yang berbeda.",
          );
        }
        continue;
      }

      if (command === "stickerly") {
        const query = args.join(" ").trim();
        if (!query) {
          await reply(
            `❓ Format: ${CONFIG.prefix}stickerly <nama stiker>\nContoh: ${CONFIG.prefix}stickerly jokowi`,
          );
          continue;
        }

        await reply("⏳ Sedang mencari stiker...");

        try {
          const stickerList = await searchStickerly(query);

          if (!stickerList || stickerList.length === 0) {
            await reply(`❌ Stiker "${query}" tidak ditemukan.`);
            continue;
          }

          let message = `😜 *HASIL PENCARIAN STIKER - STICKERLY*\n\n`;

          // Ambil 5 stiker terbaik
          stickerList.slice(0, 5).forEach((sticker, index) => {
            message += `*${index + 1}. ${sticker.name}*\n`;
            message += `👤 Pembuat: ${sticker.author}\n`;
            message += `📋 Jumlah: ${sticker.stickerCount} stiker\n`;
            message += `🔍 Views: ${sticker.viewCount} | Export: ${sticker.exportCount}\n`;
            message += `🔗 ${sticker.url}\n\n`;
          });

          await reply(message);
        } catch (err) {
          console.error("Stickerly Error:", err);
          await reply(`❌ ${err.message}`);
        }
        continue;
      }

      if (command === "stiker") {
        const quotedMessage =
          msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isImage =
          msg.message?.imageMessage || quotedMessage?.imageMessage;

        if (!isImage) {
          await reply(
            "❓ Kirim gambar dengan caption !stiker, atau reply gambar dengan !stiker.",
          );
          continue;
        }

        await reply("⏳ Sedang membuat stiker...");

        try {
          let mediaMessage =
            msg.message?.imageMessage || quotedMessage.imageMessage;
          const stream = await downloadContentFromMessage(
            mediaMessage,
            "image",
          );
          let buffer = await streamToBuffer(stream);

          // Proses gambar menjadi WebP dengan sharp
          buffer = await sharp(buffer)
            .resize(512, 512, {
              fit: "contain",
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .webp({ lossless: true })
            .toBuffer();
          console.log("Ukuran buffer stiker (WebP):", buffer.length);

          await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
          await reply("✅ Stiker berhasil dibuat dan dikirim!");
        } catch (error) {
          console.error("Error saat membuat stiker:", error);
          await reply(
            "❌ Gagal membuat stiker. Pastikan format gambar didukung.",
          );
        }
        continue;
      }

      if (command === "qrcode") {
        const text = args.join(" ").trim();
        if (!text) {
          await reply(
            `❓ Format: ${CONFIG.prefix}qrcode <text>\n` +
              `Contoh: ${CONFIG.prefix}qrcode https://github.com/wira09`,
          );
          continue;
        }

        await reply("⏳ Sedang generate QR code...");
        const qrResult = await generateQRCode(text);

        if (qrResult.error) {
          await reply(qrResult.error);
          continue;
        }

        try {
          await sock.sendMessage(
            from,
            {
              image: qrResult.data.image,
              caption: `📱 *QR Code Generated*\n\n📝 Text: ${qrResult.data.text}`,
            },
            { quoted: msg },
          );
        } catch (error) {
          console.error("Error saat send QR code:", error);
          await reply("❌ Gagal mengirim QR code image.");
        }
        continue;
      }

      if (command === "tts") {
        const text = args.join(" ").trim();
        if (!text) {
          await reply(
            `❓ Format: ${CONFIG.prefix}tts <text>\n` +
              `Contoh: ${CONFIG.prefix}tts i love you wira\n\n` +
              `💬 Voice tersedia:\n` +
              `• Nahida, Nami, Ana, Optimus Prime, Goku\n` +
              `• Elon Musk, Mickey Mouse, Kendrick Lamar, Eminem`,
          );
          continue;
        }

        await reply("⏳ Sedang generate text-to-speech...");
        const ttsResult = await getTextToSpeech(text);

        if (ttsResult.error) {
          await reply(ttsResult.error);
          continue;
        }

        try {
          const voice = ttsResult.data.selectedVoice;

          // Validasi URL sebelum kirim
          if (!voice.url) {
            await reply("❌ Audio URL tidak ditemukan dari API.");
            continue;
          }

          console.log(`[TTS] Voice: ${voice.name}`);
          console.log(`[TTS] Audio URL: ${voice.url}`);

          // Kirim audio langsung dari URL seperti soundcloud
          await sock.sendMessage(
            from,
            {
              audio: { url: voice.url },
              mimetype: "audio/mpeg",
              ptt: false,
            },
            { quoted: msg },
          );

          console.log("[TTS] Audio sent successfully");

          await reply(
            `🎵 *TTS Generated*\n\n` +
              `📝 Text: ${ttsResult.data.text}\n` +
              `🎤 Voice: ${voice.name}`,
          );
        } catch (error) {
          console.error("[TTS] Error:", error.message);
          await reply(`❌ Error: ${error.message}`);
        }
        continue;
      }

      if (command === "donasi") {
        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || subcommand === "qris") {
          try {
            const fs = require("fs");
            const qrisPath = "./img/qris wira.jpeg";

            if (!fs.existsSync(qrisPath)) {
              await reply("❌ File QRIS tidak ditemukan.");
              continue;
            }

            const qrisBuffer = fs.readFileSync(qrisPath);

            await sock.sendMessage(
              from,
              {
                image: qrisBuffer,
                caption:
                  `💝 *Terima Kasih Atas Dukungan Anda*\n\n` +
                  `Di bawah ini adalah QRIS untuk donasi:\n\n` +
                  `Atas nama: Mohamad Zaelani Wira Kusuma\n` +
                  `📱 Scan QR Code di atas\n\n` +
                  `Donasi Anda sangat berarti untuk\n` +
                  `pengembangan bot ini! 🙏\n\n` +
                  `Terima kasih telah mendukung! ❤️`,
              },
              { quoted: msg },
            );
          } catch (error) {
            console.error("Error sending QRIS:", error);
            await reply("❌ Gagal mengirim QRIS. Silahkan coba lagi nanti.");
          }
          continue;
        }

        if (subcommand === "info") {
          await reply(
            `💝 *Info Donasi*\n\n` +
              `Gunakan command: ${CONFIG.prefix}donasi qris\n\n` +
              `Untuk menampilkan QR Code QRIS untuk donasi.\n\n` +
              `Terima kasih atas dukungan Anda! 🙏`,
          );
          continue;
        }

        // Default: tampilkan QRIS
        try {
          const fs = require("fs");
          const qrisPath = "./img/qris wira.jpeg";

          if (!fs.existsSync(qrisPath)) {
            await reply("❌ File QRIS tidak ditemukan.");
            continue;
          }

          const qrisBuffer = fs.readFileSync(qrisPath);

          await sock.sendMessage(
            from,
            {
              image: qrisBuffer,
              caption:
                `💝 *Terima Kasih Atas Dukungan Anda*\n\n` +
                `Di bawah ini adalah QRIS untuk donasi:\n\n` +
                `Atas nama: Mohamad Zaelani Wira Kusuma\n` +
                `📱 Scan QR Code di atas\n\n` +
                `Donasi Anda sangat berarti untuk\n` +
                `pengembangan bot ini! 🙏\n\n` +
                `Terima kasih telah mendukung! ❤️`,
            },
            { quoted: msg },
          );
        } catch (error) {
          console.error("Error sending QRIS:", error);
          await reply("❌ Gagal mengirim QRIS. Silahkan coba lagi nanti.");
        }
        continue;
      }

      if (
        ["addadmin", "deladmin", "kick", "listadmin"].includes(command) &&
        !db.isAdmin(senderNumber)
      ) {
        console.log("[Admin] Ditolak:", {
          senderJid,
          senderNumber,
          admins: db.loadDB().admins,
        });
        await reply("🚫 Kamu bukan admin bot!");
        continue;
      }

      if (command === "addadmin") {
        const target = args[0]?.replace(/[^0-9]/g, "");
        if (!target) {
          await reply("❓ Format: !addadmin 628xxx");
          continue;
        }
        const result = db.addAdmin(target);
        await reply(
          result
            ? `✅ ${target} berhasil ditambahkan sebagai admin bot.`
            : `ℹ️ ${target} sudah menjadi admin.`,
        );
        continue;
      }

      if (command === "deladmin") {
        const target = args[0]?.replace(/[^0-9]/g, "");
        if (!target) {
          await reply("❓ Format: !deladmin 628xxx");
          continue;
        }
        if (target === CONFIG.ownerNumber) {
          await reply("🚫 Owner tidak bisa dihapus!");
          continue;
        }
        db.removeAdmin(target);
        await reply(`✅ ${target} berhasil dihapus dari admin bot.`);
        continue;
      }
      // fitur kick lama
      // if (command === "kick") {
      //   if (!isGroup) {
      //     await reply("❌ Perintah ini hanya untuk grup.");
      //     continue;
      //   }
      //   const mentioned =
      //     msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
      //   if (mentioned.length === 0) {
      //     await reply("❓ Tag member yang mau di-kick: !kick @member");
      //     continue;
      //   }
      //   try {
      //     await sock.groupParticipantsUpdate(from, mentioned, "remove");
      //     const names = mentioned.map((j) => `@${formatNumber(j)}`).join(", ");
      //     await sock.sendMessage(from, {
      //       text: `✅ ${names} berhasil di-kick.`,
      //       mentions: mentioned,
      //     });
      //   } catch (error) {
      //     // Tangkap dan log error
      //     console.error("Error saat kick member:", error);
      //     await reply("❌ Bot harus jadi admin grup untuk bisa kick member!");
      //   }
      //   continue;
      // }
      if (command === "kick") {
        if (!isGroup) {
          await reply("❌ Perintah ini hanya untuk grup.");
          continue;
        }
        const mentioned =
          msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) {
          await reply("❓ Tag member yang mau di-kick: !kick @member");
          continue;
        }
        try {
          await sock.groupParticipantsUpdate(from, mentioned, "remove");
          const names = mentioned.map((j) => `@${formatNumber(j)}`).join(", ");
          await sock.sendMessage(from, {
            text: `✅ ${names} berhasil di-kick.`,
            mentions: mentioned,
          });
        } catch (error) {
          console.error("Error saat kick member:", error);
          await reply(
            "❌ Bot gagal meng-kick member. Pastikan bot adalah admin dan member yang di-kick bukan admin grup.",
          );
        }
        continue;
      }

      if (command === "listadmin") {
        const data = db.loadDB();
        const list = data.admins.map((n, i) => `${i + 1}. ${n}`).join("\n");
        await reply(`👑 *Daftar Admin Bot:*\n\n${list}`);
        continue;
      }

      // ─── GAME CAKLONTONG ─────────────────────────────
      if (command === "caklontong") {
        if (activeGames[from]) {
          await reply(
            "❗ Masih ada soal yang belum dijawab. Jawab dulu atau ketik !nyerah untuk menyerah.",
          );
          continue;
        }
        await reply("⏳ Mengambil soal...");
        const soal = await getCaklontongQuestion();
        if (soal.error) {
          await reply(soal.error);
          continue;
        }
        activeGames[from] = soal;
        await reply(
          `🧩 *Cak Lontong*\n\n` +
            `Soal: ${soal.soal}\n\n` +
            `Balas dengan !jawabanmu atau ketik !nyerah jika tidak tahu.`,
        );
        continue;
      }

      if (command === "nyerah") {
        if (!activeGames[from]) {
          await reply("❗ Tidak ada soal yang aktif. Mulai dengan !caklontong");
          continue;
        }
        const soal = activeGames[from];
        delete activeGames[from];
        await reply(
          `😅 Jawabannya adalah: *${soal.jawaban}*\n\n${soal.deskripsi ? soal.deskripsi : ""}`,
        );
        continue;
      }

      // Cek jawaban jika ada game aktif
      if (activeGames[from] && text) {
        const soal = activeGames[from];
        const jawabanBenar = soal.jawaban
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "");
        let jawabanUser = text.trim().toLowerCase().replace(/\s+/g, "");
        if (jawabanUser.startsWith(CONFIG.prefix)) {
          jawabanUser = jawabanUser.slice(CONFIG.prefix.length);
        }
        if (jawabanUser === jawabanBenar) {
          delete activeGames[from];
          await reply(
            `🎉 Benar! Jawabannya: *${soal.jawaban}*\n\n${soal.deskripsi ? soal.deskripsi : ""}`,
          );
        } else {
          await reply("❌ Salah! Coba lagi atau ketik !nyerah.");
        }
        continue;
      }
    }
  });
}

startBot().catch(console.error);
