import {Client, Message} from "discord.js";
import fetch from "node-fetch";
// @ts-ignore
import convert from "heic-convert";
import * as fs from "fs";

const config = JSON.parse(fs.readFileSync(process.env.UTILBOT_CONFIG ?? "/utilbotconfig.json", 'utf8'));

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
    const heic = message.attachments.find(i => i.attachment.toString().toLowerCase().endsWith(".heic"));
    if(heic) {
        const response = await fetch(heic.url.toString());
        const buffer = await response.buffer();
        const outputBuffer = await convert({
            buffer: buffer,
            format: 'JPEG',
            quality: 0.8,
        });
        try {
            await message.channel.send({
                files: [{
                    attachment: outputBuffer,
                    name: heic.url.toString().split("/").reverse()[0].split('.').slice(0, -1).join('.') + ".jpg"
                }]
            });
        } catch {}
    }
}

client.on("messageCreate", message => {
    handleHEIC(message);
})

client.login(config.token);

client.on("ready", () => console.log("UtilBot Ready"));