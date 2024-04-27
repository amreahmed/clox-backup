import { CategoryData, StageChannelData, TextChannelData, VoiceChannelData } from './';
export interface ChannelsData {
    categories: CategoryData[];
    others: Array<TextChannelData | VoiceChannelData | StageChannelData>;
}
