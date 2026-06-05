import dotenv from "dotenv";
import { slashCommandJson } from "../discord/commands.js";

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !applicationId) {
  throw new Error("DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID are required");
}

const headers = {
  Authorization: `Bot ${token}`,
  "Content-Type": "application/json",
};

async function run(): Promise<void> {
  const base = "https://discord.com/api/v10";
  const endpoint = guildId
    ? `${base}/applications/${applicationId}/guilds/${guildId}/commands`
    : `${base}/applications/${applicationId}/commands`;

  const response = await fetch(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify(slashCommandJson),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Command registration failed (${response.status}): ${body}`);
  }

  console.log(`Registered ${slashCommandJson.length} ${guildId ? "guild" : "global"} commands`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
