import { BaseChannelData } from './';

export interface StageChannelData extends BaseChannelData {
    bitrate: number;
    userLimit: number;
}
