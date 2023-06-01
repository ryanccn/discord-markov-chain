import { ActivityType, Client, GatewayIntentBits } from "discord.js";
import { Markov, MarkovData } from "kurwov";
import BadWords from "bad-words";

import { readFile } from "fs/promises";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
});

const main = async () => {
  await client.login(process.env.DISCORD_TOKEN!);
  client.user!.setPresence({
    activities: [{ name: "generating responses", type: ActivityType.Playing }],
  });

  console.log("Logged in to Discord");

  const channel = await client.channels.fetch(process.env.DISCORD_OUTPUT_ID!);

  if (!channel?.isTextBased())
    throw new Error("Couldn't find acceptable channel");

  const messages = await readFile("messages.json", { encoding: "utf-8" }).then(
    (t) => JSON.parse(t) as string[]
  );

  const markovData = new MarkovData(messages);
  const filter = new BadWords({ placeHolder: "\\*" });

  while (true) {
    const message = filter.clean(Markov.generate({ data: markovData }));
    if (message.trim().length === 0) continue;

    console.log(`> ${message}`);
    await channel.send({ content: message, allowedMentions: { parse: [] } });

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 15_000);
    });
  }
};

main();
