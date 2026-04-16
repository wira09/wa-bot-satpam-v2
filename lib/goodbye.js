const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

async function resolveImageSource(src, fallbackName = "image.jpg") {
  if (!src) return null;
  if (Buffer.isBuffer(src)) {
    return {
      value: src,
      options: { filename: fallbackName, contentType: "image/jpeg" },
    };
  }
  if (typeof src === "string" && !/^https?:\/\//i.test(src)) {
    const p = path.resolve(src);
    if (!fs.existsSync(p)) throw new Error(`File tidak ditemukan: ${p}`);
    return {
      value: fs.createReadStream(p),
      options: { filename: path.basename(p) },
    };
  }
  if (typeof src === "string") {
    const res = await axios.get(src, {
      responseType: "arraybuffer",
      timeout: 20000,
    });
    return {
      value: Buffer.from(res.data),
      options: { filename: fallbackName, contentType: "image/jpeg" },
    };
  }
  throw new Error("Tipe sumber gambar tidak dikenali.");
}

async function generateGoodbyeV5({
  username,
  guildName,
  memberCount,
  quality = 90,
  background,
  avatar,
}) {
  if (!username || !guildName || !memberCount) {
    throw new Error("username, guildName, dan memberCount wajib diisi.");
  }
  const form = new FormData();
  form.append("username", String(username));
  form.append("guildName", String(guildName));
  form.append("memberCount", String(memberCount));
  form.append("quality", String(quality));

  const bg = await resolveImageSource(background, "background.jpg");
  const av = await resolveImageSource(avatar, "avatar.jpg");
  if (!bg) throw new Error("Background wajib diisi.");
  if (!av) throw new Error("Avatar wajib diisi.");

  form.append("background", bg.value, bg.options);
  form.append("avatar", av.value, av.options);

  const res = await axios.post(
    "https://api.siputzx.my.id/api/canvas/goodbyev5",
    form,
    { headers: form.getHeaders(), responseType: "arraybuffer", timeout: 30000 },
  );
  return Buffer.from(res.data);
}

module.exports = { generateGoodbyeV5 };
