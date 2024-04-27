import type { CategoryData, ChannelPermissionsData, CreateOptions, LoadOptions, MessageData, StageChannelData, TextChannelData, VoiceChannelData } from './types';
import { CategoryChannel, Guild, TextChannel, VoiceChannel, NewsChannel, ThreadChannel, StageChannel } from 'discord.js';
/**
 * Gets the permissions for a channel
 */
export declare function fetchChannelPermissions(channel: TextChannel | VoiceChannel | CategoryChannel | NewsChannel | StageChannel): ChannelPermissionsData[];
/**
 * Fetches the voice channel data that is necessary for the backup
 */
export declare function fetchVoiceChannelData(channel: VoiceChannel): Promise<VoiceChannelData>;

export declare function fetchStageChannelData(channel: StageChannel): Promise<StageChannelData>;

export declare function fetchChannelMessages(channel: TextChannel | NewsChannel | ThreadChannel, options: CreateOptions): Promise<MessageData[]>;
/**
 * Fetches the text channel data that is necessary for the backup
 */
export declare function fetchTextChannelData(channel: TextChannel | NewsChannel, options: CreateOptions): Promise<TextChannelData>;
/**
 * Creates a category for the guild
 */
export declare function loadCategory(categoryData: CategoryData, guild: Guild): Promise<CategoryChannel>;
/**
 * Create a channel and returns it
 */
export declare function loadChannel(channelData: TextChannelData | VoiceChannelData | StageChannelData, guild: Guild, category?: CategoryChannel, options?: LoadOptions): Promise<unknown>;
/**
 * Delete all roles, all channels, all emojis, etc... of a guild
 */
export declare function clearGuild(guild: Guild): Promise<void>;
