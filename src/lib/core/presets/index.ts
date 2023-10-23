import { craPreset, vitePreset } from './app';
import { nextPreset, nextStaticPreset } from './next';
import { nodeServicePreset } from './nodeService';
import { jqPreset } from './utils/jq';

export const defaulPresets = [
  nextStaticPreset,
  nextPreset,
  vitePreset,
  craPreset,
  nodeServicePreset,
];

export const allPresets = [jqPreset, ...defaulPresets];
