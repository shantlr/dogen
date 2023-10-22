import { craPreset, vitePreset } from './app';
import { buildNodeBasePreset } from './node';
import { jqPreset } from './utils/jq';

export const defaulPresets = [vitePreset, craPreset, buildNodeBasePreset];

export const allPresets = [jqPreset, ...defaulPresets];
