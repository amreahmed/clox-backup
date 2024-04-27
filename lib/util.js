"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearGuild = exports.loadChannel = exports.loadCategory = exports.fetchTextChannelData = exports.fetchChannelMessages = exports.fetchVoiceChannelData = exports.fetchChannelPermissions = exports.fetchStageChannelData = void 0;
const discord_js_1 = require("discord.js");
const node_fetch_1 = require("node-fetch");
const MaxBitratePerTier = {
    [discord_js_1.GuildPremiumTier.None]: 64000,
    [discord_js_1.GuildPremiumTier.Tier1]: 128000,
    [discord_js_1.GuildPremiumTier.Tier2]: 256000,
    [discord_js_1.GuildPremiumTier.Tier3]: 384000
};
/**
 * Gets the permissions for a channel
 */
function fetchChannelPermissions(channel) {
    const permissions = [];
    channel.permissionOverwrites.cache
        .filter((p) => p.type === discord_js_1.OverwriteType.Role)
        .forEach((perm) => {
        // For each overwrites permission
        const role = channel.guild.roles.cache.get(perm.id);
        if (role) {
            permissions.push({
                roleName: role.name,
                allow: perm.allow.bitfield.toString(),
                deny: perm.deny.bitfield.toString()
            });
        }
    });
    return permissions;
}
exports.fetchChannelPermissions = fetchChannelPermissions;
/**
 * Fetches the voice channel data that is necessary for the backup
 */
async function fetchVoiceChannelData(channel) {
    return new Promise(async (resolve) => {
        const channelData = {
            type: discord_js_1.ChannelType.GuildVoice,
            name: channel.name,
            bitrate: channel.bitrate,
            parent: channel.parent ? channel.parent.name : null,
            permissions: fetchChannelPermissions(channel),
            userLimit: channel.userLimit || 0,
        };
        /* Return channel data */
        resolve(channelData);
    });
}
exports.fetchVoiceChannelData = fetchVoiceChannelData;

async function fetchStageChannelData(channel) {
    return new Promise(async (resolve) => {
        const channelData = {
            type: discord_js_1.ChannelType.GuildStageVoice,
            name: channel.name,
            bitrate: channel.bitrate,
            parent: channel.parent ? channel.parent.name : null,
            permissions: fetchChannelPermissions(channel),
            userLimit: channel.userLimit || 0,
        };
        /* Return channel data */
        resolve(channelData);
    });
}
exports.fetchStageChannelData = fetchStageChannelData;

// Rest of the code...

/**
 * Create a channel and returns it
 */
async function loadChannel(channelData, guild, category, options) {
    return new Promise(async (resolve) => {
        const loadMessages = (channel, messages, previousWebhook) => {
            return new Promise(async (resolve) => {
                const webhook = previousWebhook || await channel.createWebhook({
                    name: 'MessagesBackup',
                    avatar: channel.client.user.displayAvatarURL()
                }).catch(() => { });
                if (!webhook)
                    return resolve();
                messages = messages
                    .filter((m) => m.content.length > 0 || m.embeds.length > 0 || m.files.length > 0)
                    .reverse();
                messages = messages.slice(messages.length - options.maxMessagesPerChannel);
                for (const msg of messages) {
                    const sentMsg = await webhook
                        .send({
                        content: msg.content.length ? msg.content : undefined,
                        username: msg.username,
                        avatarURL: msg.avatar,
                        embeds: msg.embeds,
                        files: msg.files.map((f) => new discord_js_1.AttachmentBuilder(f.attachment, {
                            name: f.name
                        })),
                        allowedMentions: options.allowedMentions,
                        threadId: channel.isThread() ? channel.id : undefined
                    })
                        .catch((err) => {
                        console.log(err.message);
                    });
                    if (msg.pinned && sentMsg)
                        await sentMsg.pin();
                }
                resolve(webhook);
            });
        };
        const createOptions = {
            name: channelData.name,
            type: null,
            parent: category
        };
        if (channelData.type === discord_js_1.ChannelType.GuildText || channelData.type === discord_js_1.ChannelType.GuildNews) {
            createOptions.topic = channelData.topic;
            createOptions.nsfw = channelData.nsfw;
            createOptions.rateLimitPerUser = channelData.rateLimitPerUser;
            createOptions.type =
                channelData.isNews && guild.features.includes(discord_js_1.GuildFeature.News) ? discord_js_1.ChannelType.GuildNews : discord_js_1.ChannelType.GuildText;
        }
        else if (channelData.type === discord_js_1.ChannelType.GuildVoice || channelData.type === discord_js_1.ChannelType.GuildStageVoice) {
            // Downgrade bitrate
            let bitrate = channelData.bitrate;
            const bitrates = Object.values(MaxBitratePerTier);
            while (bitrate > MaxBitratePerTier[guild.premiumTier]) {
                bitrate = bitrates[guild.premiumTier];
            }
            createOptions.bitrate = bitrate;
            createOptions.userLimit = channelData.userLimit;
            createOptions.type = discord_js_1.ChannelType.GuildVoice;
        }
        guild.channels.create(createOptions).then(async (channel) => {
            /* Update channel permissions */
            const finalPermissions = [];
            channelData.permissions.forEach((perm) => {
                const role = guild.roles.cache.find((r) => r.name === perm.roleName);
                if (role) {
                    finalPermissions.push({
                        id: role.id,
                        allow: BigInt(perm.allow),
                        deny: BigInt(perm.deny)
                    });
                }
            });
            await channel.permissionOverwrites.set(finalPermissions);
            if (channelData.type === discord_js_1.ChannelType.GuildText) {
                /* Load messages */
                let webhook;
                if (channelData.messages.length > 0) {
                    webhook = await loadMessages(channel, channelData.messages).catch(() => { });
                }
                /* Load threads */
                if (channelData.threads.length > 0) { //&& guild.features.includes('THREADS_ENABLED')) {
                    await Promise.all(channelData.threads.map(async (threadData) => {
                        let autoArchiveDuration = threadData.autoArchiveDuration;
                        //if (!guild.features.includes('SEVEN_DAY_THREAD_ARCHIVE') && autoArchiveDuration === 10080) autoArchiveDuration = 4320;
                        //if (!guild.features.includes('THREE_DAY_THREAD_ARCHIVE') && autoArchiveDuration === 4320) autoArchiveDuration = 1440;
                        return channel.threads.create({
                            name: threadData.name,
                            autoArchiveDuration
                        }).then((thread) => {
                            if (!webhook)
                                return;
                            return loadMessages(thread, threadData.messages, webhook);
                        });
                    }));
                }
                return channel;
            }
            else {
                resolve(channel); // Return the channel
            }
        });
    });
}
exports.loadChannel = loadChannel;
/**
 * Delete all roles, all channels, all emojis, etc... of a guild
 */
async function clearGuild(guild) {
    guild.roles.cache
        .filter((role) => !role.managed && role.editable && role.id !== guild.id)
        .forEach((role) => {
        role.delete().catch(() => { });
    });
    guild.channels.cache.forEach((channel) => {
        channel.delete().catch(() => { });
    });
    guild.emojis.cache.forEach((emoji) => {
        emoji.delete().catch((err) => {console.log(err)});
    });
    const webhooks = await guild.fetchWebhooks();
    webhooks.forEach((webhook) => {
        webhook.delete().catch(() => { });
    });
    const bans = await guild.bans.fetch();
    bans.forEach((ban) => {
        guild.members.unban(ban.user).catch(() => { });
    });
    guild.setAFKChannel(null);
    guild.setAFKTimeout(60 * 5);
    guild.setIcon(null);
    guild.setBanner(null).catch(() => { });
    guild.setSplash(null).catch(() => { });
    guild.setDefaultMessageNotifications(discord_js_1.GuildDefaultMessageNotifications.OnlyMentions);
    guild.setWidgetSettings({
        enabled: false,
        channel: null
    });
    if (!guild.features.includes(discord_js_1.GuildFeature.Community)) {
        guild.setExplicitContentFilter(discord_js_1.GuildExplicitContentFilter.Disabled);
        guild.setVerificationLevel(discord_js_1.GuildVerificationLevel.None);
    }
    guild.setSystemChannel(null);
    guild.setSystemChannelFlags([discord_js_1.GuildSystemChannelFlags.SuppressGuildReminderNotifications, discord_js_1.GuildSystemChannelFlags.SuppressJoinNotifications, discord_js_1.GuildSystemChannelFlags.SuppressPremiumSubscriptions]);
    return;
}
exports.clearGuild = clearGuild;
