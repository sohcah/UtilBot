import {
  Client,
  Message,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessageFlags,
  TextChannel,
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
  messageCacheLifetime: 1,
  intents: ["GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILDS", "GUILD_EMOJIS_AND_STICKERS"],
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
  const fitMatch = message.content.match(/\[fit:(\w+)]/);
  if (fitMatch?.[1]) {
    options.fit = fitMatch[1] as any;
  }
  const automaticallyConvertableImage = message.attachments.find(i =>
      [".heic", ".pdf", ".svg"].some(e => i.attachment.toString().toLowerCase().endsWith(e))
  );
  const anyConvertableImage = message.attachments.find(i =>
      [".heic", ".pdf", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"].some(e => i.attachment.toString().toLowerCase().endsWith(e))
  );
  if (automaticallyConvertableImage || (Object.keys(options).length > 0 && anyConvertableImage)) {
    const convertableImage = automaticallyConvertableImage ?? anyConvertableImage!;
    console.log(`Converting file to JPEG for ${convertableImage.url.toString()}`);
    const response = await fetch(convertableImage.url.toString());
    const buffer = await response.buffer();
    let image = sharp(buffer);
    if (Object.keys(options).length > 0) {
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
  if (message.flags.has(MessageFlags.FLAGS.IS_CROSSPOST)) {
    const followMerge = (message.channel as TextChannel).topic?.match(/<FollowMerge:(\d+)>/);
    if (followMerge?.[1]) {
      const channel = message.guild?.channels.resolve(followMerge[1]) as TextChannel | undefined;
      if (channel) {
        channel.send({
          embeds: [
            new MessageEmbed()
              .setDescription(message.content)
              .setAuthor(message.author.username, message.author.displayAvatarURL())
              .setThumbnail(message.author.displayAvatarURL())
              .setTimestamp(message.createdTimestamp)
              .setFooter(`UtilBot FollowMerge`),
            ...message.embeds,
          ],
          stickers: [...message.stickers.values()],
          files: [...message.attachments.values()],
          components: [
            new MessageActionRow().addComponents(
              new MessageButton()
                .setLabel("Original Message")
                .setStyle("LINK")
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
