import {
  Client,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
  ButtonStyle, IntentsBitField,
} from "discord.js";
import fetch from "node-fetch";
import * as fs from "fs";
import sharp, {ResizeOptions} from "sharp";

const config = JSON.parse(
  process.env.CONFIG ?? fs.readFileSync(process.env.UTILBOT_CONFIG ?? "/utilbotconfig.json", "utf8")
);

console.log("format", sharp.format);

const client = new Client({
  allowedMentions: {
    parse: [],
    users: [],
    roles: [],
    repliedUser: false,
  },
  intents: [
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildEmojisAndStickers,
  ],
});

async function handleImageConversion(message: Message) {
  const options: ResizeOptions = {};
  const heightMatch = message.content.match(/\[height:(\d+)]/);
  if (heightMatch?.[1]) {
    options.height = parseInt(heightMatch[1]);
  }
  const widthMatch = message.content.match(/\[width:(\d+)]/);
  if (widthMatch?.[1]) {
    options.width = parseInt(widthMatch[1]);
  }
  const automaticallyConvertableImage = message.attachments.find(i =>
      [".heic", ".pdf", ".svg"].some(e => i.name.toLowerCase().endsWith(e))
  );
  const anyConvertableImage = message.attachments.find(i =>
      [".heic", ".pdf", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"].some(e => i.name.toLowerCase().endsWith(e))
  );
  if (automaticallyConvertableImage || (Object.keys(options).length > 0 && anyConvertableImage)) {
    const convertableImage = automaticallyConvertableImage ?? anyConvertableImage!;
    console.log(`Converting file to JPEG for ${convertableImage.url.toString()}`);
    const response = await fetch(convertableImage.url.toString());
    const buffer = await response.buffer();
    let image = sharp(buffer);
    if (Object.keys(options).length > 0) {
      const fitMatch = message.content.match(/\[fit:(\w+)]/);
      if (fitMatch?.[1]) {
        options.fit = fitMatch[1] as any;
      }
      if (message.content.match(/\[pixel]/)) {
        options.kernel = "nearest";
      }
      image = image.resize(options);
    }
    const outputBuffer = await image.png().toBuffer();
    try {
      await message.channel.send({
        files: [
          {
            attachment: outputBuffer,
            name:
              convertableImage.url.toString().split("/").reverse()[0].split(".").slice(0, -1).join(".") +
              ".png",
          },
        ],
      });
    } catch {}
  }
}

async function handleFollowMerge(message: Message) {
  if (message.flags.has(MessageFlags.Crossposted)) {
    const followMerge = (message.channel as TextChannel).topic?.match(/<FollowMerge:(\d+)>/);
    if (followMerge?.[1]) {
      const channel = message.guild?.channels.resolve(followMerge[1]) as TextChannel | undefined;
      if (channel) {
        channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(message.content)
              .setAuthor({
                name: message.author.username,
                iconURL: message.author.displayAvatarURL()
              })
              .setThumbnail(message.author.displayAvatarURL())
              .setTimestamp(message.createdTimestamp)
              .setFooter({
                text: `UtilBot FollowMerge`
              }),
            ...message.embeds,
          ],
          stickers: [...message.stickers.values()],
          files: [...message.attachments.values()],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel("Original Message")
                .setStyle(ButtonStyle.Link)
                .setURL(
                  `https://discord.com/channels/${message.reference?.guildId}/${message.reference?.channelId}/${message.reference?.messageId}`
                )
            ),
          ],
          allowedMentions: {
            roles: [],
            repliedUser: false,
            users: [],
            parse: [],
          },
        });
      }
    }
  }
}

client.on("messageCreate", message => {
  handleFollowMerge(message);
  if (message.author.bot) return;
  handleImageConversion(message);
});

client.login(config.token);

client.on("ready", () => console.log("UtilBot Ready"));
