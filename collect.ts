import "dotenv/config";

import {
  ActivityType,
  ChannelType,
  Client,
  Collection,
  GatewayIntentBits,
  Message,
} from "discord.js";

import {
  readMessages,
  readProgress,
  updateProgress,
  writeMessages,
} from "./lib";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
});

const AUTHOR_ID = process.env.DISCORD_AUTHOR_ID!;

const main = async () => {
  await client.login(process.env.DISCORD_TOKEN!);
  client.user!.setPresence({
    activities: [{ name: "collecting data", type: ActivityType.Playing }],
  });

  console.log("Logged in to Discord");

  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID!);

  if (channel?.type !== ChannelType.GuildText)
    throw new Error("Couldn't find acceptable channel");

  console.log("Started crawling");

  const messages = new Set<string>();
  let lastMessageId: string | null = null;

  let wasInterrupted = false;
  process.on("SIGINT", () => {
    wasInterrupted = true;
  });

  try {
    const fsMessages = await readMessages(AUTHOR_ID);

    fsMessages.forEach((m) => {
      messages.add(m);
    });
  } catch {
    console.warn("No messages.json found, starting from scratch");
  }

  try {
    const fsProgress = await readProgress(AUTHOR_ID);

    lastMessageId = fsProgress[channel.id] ?? null;
  } catch {
    console.warn("No progress.json found, starting from scratch");
  }

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

  console.log(`Ended crawling, ${messages.size} messages saved`);

  await writeMessages(AUTHOR_ID, [...messages]);
  await updateProgress(AUTHOR_ID, channel.id, lastMessageId);

  client.destroy();
};

main();
