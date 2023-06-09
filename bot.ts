import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ComponentType,
  Events,
  GatewayIntentBits,
  REST,
  RESTGetAPIOAuth2CurrentApplicationResult,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { Markov, MarkovData } from "kurwov";
import BadWords from "bad-words";

import { readMessages } from "./lib";

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

const syncCommands = async () => {
  const commands = [
    new SlashCommandBuilder()
      .setName("size")
      .setDescription("Find the size of the data for a user")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to simulate")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("generate")
      .setDescription("Generate a message from the all-powerful Markov chain")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to simulate")
          .setRequired(true)
      ),
  ]
    .map((command) => command.setDMPermission(false))
    .map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

  const { id: appId } = (await rest.get(
    Routes.oauth2CurrentApplication()
  )) as RESTGetAPIOAuth2CurrentApplicationResult;

  await rest.put(Routes.applicationCommands(appId), {
    body: commands,
  });
};

const main = async () => {
  await syncCommands();
  console.log("Synced commands");

  await client.login(process.env.DISCORD_TOKEN!);
  client.user!.setPresence({
    activities: [{ name: "generating responses", type: ActivityType.Playing }],
  });

  console.log("Connected!");

  const filter = new BadWords({ placeHolder: "\\*" });

  client.on(Events.InteractionCreate, async (i) => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === "generate") {
      const user = i.options.getUser("user", true);

      let messages;
      try {
        messages = await readMessages(user.id);
      } catch {
        await i.reply({
          content: `<@${user.id}> does not have any data!`,
          allowedMentions: { parse: [] },
        });

        return;
      }

      const markovData = new MarkovData(messages);

      let message = "";
      while (!message) {
        message = filter.clean(Markov.generate({ data: markovData }));
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("regenerate")
          .setLabel("Regenerate")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("delete")
          .setLabel("Delete")
          .setStyle(ButtonStyle.Danger)
      );

      console.log(`> ${message}`);
      const reply = await i.reply({
        content: message,
        allowedMentions: { parse: [] },
        components: [row],
      });

      reply
        .createMessageComponentCollector({
          componentType: ComponentType.Button,
        })
        .on("collect", async (componentInteraction) => {
          if (componentInteraction.user !== i.user) return;

          if (componentInteraction.customId === "delete") {
            await reply.delete();
          } else if (componentInteraction.customId === "regenerate") {
            await componentInteraction.deferReply({ ephemeral: true });

            let newMessage = "";
            while (!newMessage) {
              newMessage = filter.clean(Markov.generate({ data: markovData }));
            }

            console.log(`> ${newMessage}`);
            await reply.edit({ content: newMessage });
            await componentInteraction.editReply("Regenerated response!");
          }
        });
    } else if (i.commandName === "size") {
      await i.deferReply();
      const user = i.options.getUser("user", true);

      let messages: string[];
      try {
        messages = await readMessages(user.id);
      } catch {
        await i.editReply({
          content: `<@${user.id}> does not have any data!`,
          allowedMentions: { parse: [] },
        });

        return;
      }

      await i.editReply(`${messages.length} messages`);
    }
  });

  client.on(Events.Error, (e) => {
    console.error(e);
  });
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
