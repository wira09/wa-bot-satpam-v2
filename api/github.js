/**
 * API untuk Stalk GitHub Profile
 */
const axios = require("axios");

const GITHUB_STALK_API_URL = "https://www.sankavollerei.com/stalk/github";
const API_KEY = "planaai";

async function getGitHubProfile(username) {
  try {
    // Validasi username
    if (!username || typeof username !== "string") {
      return {
        data: null,
        error: "❌ Silakan berikan username GitHub yang valid.",
      };
    }

    // Validasi format username (alphanumeric dan dash)
    if (!/^[a-zA-Z0-9\-]+$/.test(username.trim())) {
      return {
        data: null,
        error: "❌ Username GitHub hanya boleh berisi huruf, angka, dan dash.",
      };
    }

    const response = await axios.get(GITHUB_STALK_API_URL, {
      params: {
        apikey: API_KEY,
        username: username.trim(),
      },
      timeout: 10000,
    });

    if (response.data && response.data.status && response.data.result) {
      const result = response.data.result;

      return {
        data: {
          username: result.username || username,
          nickname: result.nickname || "N/A",
          bio: result.bio || "N/A",
          id: result.id || "N/A",
          profilePic: result.profile_pic || null,
          url: result.url || `https://github.com/${username}`,
          type: result.type || "User",
          company: result.company || "N/A",
          blog: result.blog || "N/A",
          location: result.location || "N/A",
          email: result.email || "Private",
          publicRepo: result.public_repo || 0,
          publicGists: result.public_gists || 0,
          followers: result.followers || 0,
          following: result.following || 0,
          createdAt: result.created_at || "N/A",
          updatedAt: result.updated_at || "N/A",
        },
        error: null,
      };
    }

    return {
      data: null,
      error: "❌ Username GitHub tidak ditemukan.",
    };
  } catch (error) {
    console.error("Error saat stalk GitHub:", error.message);

    if (error.response?.status === 404) {
      return {
        data: null,
        error: "❌ Username GitHub tidak ditemukan.",
      };
    }

    return {
      data: null,
      error: `❌ Error: ${error.message}`,
    };
  }
}

module.exports = {
  getGitHubProfile,
};
