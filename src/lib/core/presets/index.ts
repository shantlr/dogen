import { craPreset, vitePreset } from './app';
import { nodeServicePreset } from './nodeService';
import { jqPreset } from './utils/jq';

export const defaulPresets = [vitePreset, craPreset, nodeServicePreset];

export const allPresets = [jqPreset, ...defaulPresets];
