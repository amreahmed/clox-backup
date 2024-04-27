import { TextBasedChannelTypes, VoiceBasedChannelTypes, ThreadChannelType, StageBasedChannelTypes } from 'discord.js';
import { ChannelPermissionsData } from './';
export interface BaseChannelData {
    type: TextBasedChannelTypes | VoiceBasedChannelTypes | ThreadChannelType | StageBasedChannelTypes;
    name: string;
    parent?: string;
    permissions: ChannelPermissionsData[];
}
