const logger = require('mag')();
const fs = require('fs');
const Discord = require('discord.js');
const config = require('./config.json');

const client = new Discord.Client();

function readJson(filePath) {
    // Using sync method to ensure bot replies are loaded before he connects to discord
    const json = fs.readFileSync(filePath, { encoding: 'utf8'});
    return JSON.parse(json);
};

const announcePhrases = readJson('./data/announce.json');
logger.log(`Loaded ${announcePhrases.length} announce phrase(s)`);

const normalPhrases = readJson('./data/normal.json');
logger.log(`Loaded ${normalPhrases.length} normal phrase(s)`);

const replyPhrases = readJson('./data/reply.json');
logger.log(`Loaded ${replyPhrases.length} reply phrase(s)`);

// TODO: store timestamps in file to avoid being reset on restarts
let lastNormalTimestamp = 0;
let lastReplyTimestamp = 0;

function getChatChannel() {
    const channel = client.channels.get(config.chatChannelId);

    if (!channel)
    {
        logger.log(`Failed to get channed #${config.chatChannelId}.`);
        return null;
    }

    return channel;
}

function getRandomAnnouncePhrase() {
    return announcePhrases[Math.floor(Math.random() * announcePhrases.length-1)];
}

function announce() {
    const channel = getChatChannel();

    if (!channel)
    {
        return;
    }
    
    const phrase = getRandomAnnouncePhrase();
    channel.send(phrase);
}

setInterval(announce, config.announceCooldownSeconds * 1000);

function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

function canPostNormal() {
    if (lastNormalTimestamp === 0)
    {
        return true;
    }

    const diff = getCurrentTimestamp - lastNormalTimestamp;
    return diff > config.normalCooldownSeconds;
}

function getRandomNormalPhrase() {
    return normalPhrases[Math.floor(Math.random() * normalPhrases.length-1)];
}

/**
 * @summary Handles normal user message
 * @param {String}  userId  Id of the user to mention
 */
function handleNormal(userId) {
    const channel = getChatChannel();

    if (!channel || !canPostNormal())
    {
        return;
    }

    lastNormalTimestamp = getCurrentTimestamp();

    const phrase = getRandomNormalPhrase();
    channel.send(`<@${userId}> ${phrase}`);
}

function canPostReply() {
    if (lastReplyTimestamp === 0)
    {
        return true;
    }

    const diff = getCurrentTimestamp - lastReplyTimestamp;
    return diff > config.replyCooldownSeconds;
}

function getRandomReplyPhrase() {
    return replyPhrases[Math.floor(Math.random() * replyPhrases.length-1)];
}

/**
 * @summary Handles bot mention in chat
 * @param {String}  userId  Id of the user to mention
 */
function handleReply(userId) {
    const channel = getChatChannel();

    if (!channel || !canPostReply())
    {
        return;
    }

    lastReplyTimestamp = getCurrentTimestamp();

    const phrase = getRandomReplyPhrase();
    channel.send(`<@${userId}> ${phrase}`);
}

/**
 * @summary Handles %say command
 * @param {String}  text    Command text without prefix
 */
function handleCommand(text) {
    const channel = client.channels.get(config.chatChannelId);

    if (!channel)
    {
        logger.log(`Failed to get channel #${config.chatChannelId}.`);
        return;
    }

    channel.send(text);
}

client.once('ready', () => {
    logger.log(`Connected as ${client.user.username}.`);
    client.user.setActivity("нытьё из леса", { type: "LISTENING" });
});

client.on('message', (msg = {}) => {
    
    if (!msg || !msg.author || !msg.channel || !!msg.author.bot)
    {
        return;
    }

    const hasSayPrefix = msg.content.startsWith(config.prefix);
    const isCommandChannel = msg.channel.id === config.sayChannelId;

    if (hasSayPrefix && isCommandChannel)
    {
        handleCommand(msg.content.substring(5));
        return;
    }

    const isChatChannel = msg.channel.id === config.chatChannelId;

    if (isChatChannel && !hasSayPrefix)
    {
        // if has @Yasuo
        if (msg.content.startsWith(`<@${client.user.id}>`))
            handleReply(msg.author.id);
        else
            handleNormal(msg.author.id);
    }
});

client.login(config.token);
