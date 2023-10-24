import { craPreset, vitePreset } from './app';
import { nextPreset } from './next';
import { nodeServicePreset } from './nodeService';
import { jqPreset } from './utils/jq';

export const defaulPresets = [
  nextPreset,
  vitePreset,
  craPreset,
  nodeServicePreset,
];

export const allPresets = [jqPreset, ...defaulPresets];
