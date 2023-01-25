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
import sharp from "sharp";

const config = JSON.parse(
  process.env.CONFIG ?? fs.readFileSync(process.env.UTILBOT_CONFIG ?? "/utilbotconfig.json", "utf8")
);

console.log("format", sharp.format);
console.log("vendor", sharp.vendor)
console.log("versions", sharp.versions)

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

async function handleHEIC(message: Message) {
  const heic = message.attachments.find(i =>
    i.attachment.toString().toLowerCase().endsWith(".heic")
  );
  if (heic) {
    console.log(`Converting HEIC to JPEG for ${heic.url.toString()}`);
    const response = await fetch(heic.url.toString());
    const buffer = await response.buffer();
    const outputBuffer = await sharp(buffer).jpeg().toBuffer();
    try {
      await message.channel.send({
        files: [
          {
            attachment: outputBuffer,
            name:
              heic.url.toString().split("/").reverse()[0].split(".").slice(0, -1).join(".") +
              ".jpg",
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
  handleHEIC(message);
});

client.login(config.token);

client.on("ready", () => console.log("UtilBot Ready"));
