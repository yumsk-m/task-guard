import { executeCommand } from "./discord/handlers.js";
import { buildReviewMessage, buildTodayMessage, buildWeeklyMessage } from "./discord/formatters.js";
import { TaskService } from "./notion/taskService.js";

type Env = {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_NOTIFICATION_CHANNEL_ID: string;
  NOTION_TOKEN: string;
  NOTION_DATABASE_ID: string;
};

type ScheduledController = {
  cron: string;
};

const PING = 1;
const PONG = 1;
const APPLICATION_COMMAND = 2;
const CHANNEL_MESSAGE_WITH_SOURCE = 4;
const EPHEMERAL = 1 << 6;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function verifyDiscordSignature(
  bodyText: string,
  signature: string,
  timestamp: string,
  publicKeyHex: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(hexToBytes(publicKeyHex)),
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  const message = new TextEncoder().encode(timestamp + bodyText);
  return crypto.subtle.verify("Ed25519", key, toArrayBuffer(hexToBytes(signature)), toArrayBuffer(message));
}

async function sendDiscordMessage(env: Env, content: string): Promise<void> {
  const response = await fetch(`https://discord.com/api/v10/channels/${env.DISCORD_NOTIFICATION_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord send failed (${response.status}): ${body}`);
  }
}

function makeTaskService(env: Env): TaskService {
  return new TaskService(env.NOTION_TOKEN, env.NOTION_DATABASE_ID);
}

async function handleInteraction(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get("X-Signature-Ed25519") ?? "";
  const timestamp = request.headers.get("X-Signature-Timestamp") ?? "";
  const bodyText = await request.text();

  if (!signature || !timestamp) {
    return json({ error: "Missing signature headers" }, 401);
  }

  const isValid = await verifyDiscordSignature(bodyText, signature, timestamp, env.DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return json({ error: "Invalid request signature" }, 401);
  }

  const body = JSON.parse(bodyText) as {
    type: number;
    data?: { name: string; options?: Array<{ name: string; type: number; value?: string }> };
  };

  if (body.type === PING) {
    return json({ type: PONG });
  }

  if (body.type === APPLICATION_COMMAND && body.data) {
    try {
      const taskService = makeTaskService(env);
      const content = await executeCommand(body.data, taskService);
      return json({
        type: CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content,
          flags: EPHEMERAL,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json({
        type: CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `エラーが発生しました: ${message}`,
          flags: EPHEMERAL,
        },
      });
    }
  }

  return json({ error: "Unsupported interaction type" }, 400);
}

async function runScheduled(cron: string, env: Env): Promise<void> {
  if (!env.DISCORD_NOTIFICATION_CHANNEL_ID) {
    return;
  }

  const taskService = makeTaskService(env);

  if (cron === "0 9 * * 1-5") {
    const tasks = await taskService.listOpenTasks();
    await sendDiscordMessage(env, buildTodayMessage(tasks));
    return;
  }

  if (cron === "30 18 * * 1-5") {
    await sendDiscordMessage(env, buildReviewMessage());
    return;
  }

  if (cron === "0 10 * * 1") {
    const tasks = await taskService.listOpenTasks();
    await sendDiscordMessage(env, buildWeeklyMessage(tasks));
    return;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }
    if (request.method === "POST" && url.pathname === "/interactions") {
      return handleInteraction(request, env);
    }
    return new Response("Not Found", { status: 404 });
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    await runScheduled(controller.cron, env);
  },
};
