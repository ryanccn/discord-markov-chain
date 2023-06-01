import "dotenv/config";

import {
  ActivityType,
  ChannelType,
  Client,
  Collection,
  GatewayIntentBits,
  Message,
} from "discord.js";
import { readFile, writeFile } from "fs/promises";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
});

// export type MessagesData = { id: string; content: string }[];

const main = async () => {
  await client.login(process.env.DISCORD_TOKEN!);
  client.user!.setPresence({
    activities: [{ name: "collecting data", type: ActivityType.Playing }],
  });

  console.log("Logged in to Discord");

  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID!);

  if (channel?.type !== ChannelType.GuildText)
    throw new Error("Couldn't find acceptable channel");

  await channel.send("Started crawling");

  let messages = new Set<string>();
  let lastMessageId: string | null = null;

  let wasInterrupted = false;
  process.on("SIGINT", () => {
    wasInterrupted = true;
  });

  try {
    const fsMessages = (await readFile("messages.json", {
      encoding: "utf-8",
    }).then((t) => JSON.parse(t))) as string[];

    fsMessages.forEach((m) => {
      messages.add(m);
    });
  } catch {}

  try {
    const fsProgress = (await readFile("progress.json", {
      encoding: "utf-8",
    }).then((t) => JSON.parse(t))) as Record<string, string>;

    lastMessageId = fsProgress[channel.id] ?? null;
  } catch {}

  while (!wasInterrupted) {
    const thisMessages = (await channel.messages.fetch({
      limit: 100,
      ...(lastMessageId ? { before: lastMessageId } : {}),
    })) as Collection<string, Message<true>>;

    lastMessageId = thisMessages.last()?.id ?? null;

    const matchingMessages = thisMessages
      .filter((m) => m.author.id === process.env.DISCORD_AUTHOR_ID)
      .map((m) => m.content.replaceAll(/\p{Script=Han}/g, ""))
      .filter(Boolean);

    matchingMessages.forEach((m) => {
      messages.add(m);
    });

    if (!thisMessages.size) {
      wasInterrupted = true;
    }

    console.log(
      `Added ${matchingMessages.length} messages to dataset (total ${messages.size})`
    );
  }

  await channel.send(`Ended crawling, ${messages.size} messages saved`);

  await writeFile("messages.json", JSON.stringify([...messages]));

  {
    const oldProgress = await readFile("progress.json", {
      encoding: "utf-8",
    }).then((txt) => JSON.parse(txt));

    oldProgress[channel.id] = lastMessageId;

    await writeFile("progress.json", JSON.stringify(oldProgress));
  }

  client.destroy();
};

main();
