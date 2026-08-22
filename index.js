const mineflayer = require("mineflayer");

const bot = mineflayer.createBot({
  host: "hexoramc.ominisave.store",
  port: 25565,

  // Change this username
  username: "HexoraBot",

  // Java Edition
  version: false,

  // For an offline/cracked server
  auth: "offline"
});

bot.once("spawn", () => {
  console.log("======================================");
  console.log("       HEXORA MC BOT ONLINE");
  console.log("======================================");
  console.log(`Server: hexoramc.ominisave.store:25565`);
  console.log(`Bot: ${bot.username}`);
  console.log("Status: Connected");
});

bot.on("chat", (username, message) => {
  if (username === bot.username) return;

  console.log(`[CHAT] ${username}: ${message}`);

  if (message === "!ping") {
    bot.chat("Pong! 🟣");
  }

  if (message === "!hello") {
    bot.chat(`Hello ${username}! 👋`);
  }
});

bot.on("kicked", (reason) => {
  console.log("Bot kicked:", reason);
});

bot.on("error", (err) => {
  console.log("Bot error:", err.message);
});

bot.on("end", () => {
  console.log("Bot disconnected.");

  // Reconnect after 10 seconds
  setTimeout(() => {
    console.log("Reconnecting...");
    process.exit(1);
  }, 10000);
});
