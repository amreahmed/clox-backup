"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setStorageFolder = exports.list = exports.remove = exports.load = exports.create = exports.fetch = void 0;
const discord_js_1 = require("discord.js");
const node_fetch_1 = require("node-fetch");
const path_1 = require("path");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const createMaster = require("./create");
const loadMaster = require("./load");
const utilMaster = require("./util");
let backups = `${__dirname}/backups`;
if (!(0, fs_1.existsSync)(backups)) {
    (0, fs_1.mkdirSync)(backups);
}
/**
 * Checks if a backup exists and returns its data
 */
const getBackupData = async (backupID) => {
    return new Promise(async (resolve, reject) => {
        const files = await (0, promises_1.readdir)(backups); // Read "backups" directory
        // Try to get the json file
        const file = files.filter((f) => f.split('.').pop() === 'json').find((f) => f === `${backupID}.json`);
        if (file) {
            // If the file exists
            const backupData = require(`${backups}${path_1.sep}${file}`);
            // Returns backup information
            resolve(backupData);
        }
        else {
            // If no backup was found, return an error message
            reject('No backup found');
        }
    });
};
exports.fetch = fetch;
/**
 * Fetches a backup and returns the information about it
 */
async function fetch(backupID) {
    try {
        const backupData = await getBackupData(backupID);
        const size = (0, fs_1.statSync)(`${backups}${path_1.sep}${backupID}.json`).size; // Gets the size of the file using fs
        const backupInfos = {
            data: backupData,
            id: backupID,
            size: Number((size / 1024).toFixed(2))
        };
        // Returns backup information
        return backupInfos;
    }
    catch (error) {
        throw error; // Forward the error
    }
}
exports.fetch = fetch;
/**
 * Creates a new backup and saves it to the storage
 */
async function create(guild, options = {
    backupID: null,
    maxMessagesPerChannel: 10,
    jsonSave: true,
    jsonBeautify: true,
    doNotBackup: [],
    backupMembers: false,
    saveImages: ''
}) {
    const intents = new discord_js_1.IntentsBitField(guild.client.options.intents);
    if (!intents.has(discord_js_1.IntentsBitField.Flags.Guilds))
        throw new Error('Guilds intent is required');
    try {
        const backupData = {
            name: guild.name,
            verificationLevel: guild.verificationLevel,
            explicitContentFilter: guild.explicitContentFilter,
            defaultMessageNotifications: guild.defaultMessageNotifications,
            afk: guild.afkChannel ? { name: guild.afkChannel.name, timeout: guild.afkTimeout } : null,
            widget: {
                enabled: guild.widgetEnabled,
                channel: guild.widgetChannel ? guild.widgetChannel.name : null
            },
            channels: { categories: [], others: [] },
            roles: [],
            bans: [],
            emojis: [],
            members: [],
            createdTimestamp: Date.now(),
            guildID: guild.id,
            id: options.backupID ?? discord_js_1.SnowflakeUtil.generate().toString()
        };
        if (guild.iconURL()) {
            console.log(guild.iconURL())
            if (options && options.saveImages && options.saveImages === 'base64') {
                try {
                    const res = await (0, node_fetch_1.default)(guild.iconURL());
                    if (!res.ok)
                        throw new Error(`Failed to fetch icon: ${res.statusText}`);
                    backupData.iconBase64 = (await res.buffer()).toString('base64');
                }
                catch (error) {
                    throw error;
                }
            }
            backupData.iconURL = guild.iconURL();
        }
        if (guild.splashURL()) {
            if (options && options.saveImages && options.saveImages === 'base64') {
                try {
                    const res = await (0, node_fetch_1.default)(guild.splashURL());
                    if (!res.ok)
                        throw new Error(`Failed to fetch splash: ${res.statusText}`);
                    backupData.splashBase64 = (await res.buffer()).toString('base64');
                }
                catch (error) {
                    throw error;
                }
            }
            backupData.splashURL = guild.splashURL();
        }
        if (guild.bannerURL()) {
            if (options && options.saveImages && options.saveImages === 'base64') {
                try {
                    const res = await (0, node_fetch_1.default)(guild.bannerURL());
                    if (!res.ok)
                        throw new Error(`Failed to fetch banner: ${res.statusText}`);
                    backupData.bannerBase64 = (await res.buffer()).toString('base64');
                }
                catch (error) {
                    throw error;
                }
            }
            backupData.bannerURL = guild.bannerURL();
        }
        if (options && options.backupMembers) {
            // Backup members
            backupData.members = await createMaster.getMembers(guild);
        }
        if (!options || !(options.doNotBackup || []).includes('bans')) {
            // Backup bans
            backupData.bans = await createMaster.getBans(guild);
        }
        if (!options || !(options.doNotBackup || []).includes('roles')) {
            // Backup roles
            backupData.roles = await createMaster.getRoles(guild);
        }
        if (!options || !(options.doNotBackup || []).includes('emojis')) {
            // Backup emojis
            backupData.emojis = await createMaster.getEmojis(guild, options);
        }
        if (!options || !(options.doNotBackup || []).includes('channels')) {
            // Backup channels
            backupData.channels = await createMaster.getChannels(guild, options);
        }
        if (!options || options.jsonSave === undefined || options.jsonSave) {
            // Convert Object to JSON
            const backupJSON = options.jsonBeautify
                ? JSON.stringify(backupData, null, 4)
                : JSON.stringify(backupData);
            // Save the backup
            await (0, promises_1.writeFile)(`${backups}${path_1.sep}${backupData.id}.json`, backupJSON, 'utf-8');
        }
        // Returns ID
        return backupData;
    }
    catch (error) {
        throw error;
    }
}
exports.create = create;
/**
 * Loads a backup for a guild
 */
async function load(backup, guild, options = {
    clearGuildBeforeRestore: true,
    maxMessagesPerChannel: 10
}) {
    if (!guild) {
        throw new Error('Invalid guild');
    }
    try {
        const backupData = typeof backup === 'string' ? await getBackupData(backup) : backup;
        try {
            if (options.clearGuildBeforeRestore === undefined || options.clearGuildBeforeRestore) {
                // Clear the guild
                await utilMaster.clearGuild(guild);
            }
            await Promise.all([
                // Restore guild configuration
                loadMaster.loadConfig(guild, backupData),
                // Restore guild roles
                loadMaster.loadRoles(guild, backupData),
                // Restore guild channels
                loadMaster.loadChannels(guild, backupData, options),
                // Restore afk channel and timeout
                loadMaster.loadAFK(guild, backupData),
                // Restore guild emojis
                loadMaster.loadEmojis(guild, backupData),
                // Restore guild bans
                loadMaster.loadBans(guild, backupData),
                // Restore embed channel
                loadMaster.loadEmbedChannel(guild, backupData)
            ]);
        }
        catch (error) {
            throw error;
        }
        // Then return the backup data
        return backupData;
    }
    catch (error) {
        throw error;
    }
}
exports.load = load;
/**
 * Removes a backup
 */
async function remove(backupID) {
    return new Promise((resolve, reject) => {
        try {
            require(`${backups}${path_1.sep}${backupID}.json`);
            (0, fs_1.unlinkSync)(`${backups}${path_1.sep}${backupID}.json`);
            resolve();
        }
        catch (error) {
            reject('Backup not found');
        }
    });
}
exports.remove = remove;
/**
 * Returns the list of all backups
 */
async function list() {
    try {
        const files = await (0, promises_1.readdir)(backups); // Read "backups" directory
        return files.map((f) => f.split('.')[0]);
    }
    catch (error) {
        throw new Error('Error listing backups');
    }
}
exports.list = list;
/**
 * Change the storage path
 */
function setStorageFolder(newPath) {
    if (newPath.endsWith(path_1.sep)) {
        newPath = newPath.substr(0, newPath.length - 1);
    }
    backups = newPath;
    if (!(0, fs_1.existsSync)(backups)) {
        (0, fs_1.mkdirSync)(backups);
    }
}
exports.setStorageFolder = setStorageFolder;
exports.default = {
    create: exports.create,
    fetch: exports.fetch,
    list: exports.list,
    load: exports.load,
    remove: exports.remove,
    setStorageFolder: exports.setStorageFolder
};
