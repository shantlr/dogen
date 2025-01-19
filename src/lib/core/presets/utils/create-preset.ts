import { AnyPresetOutput, Preset } from '../types';

export const createPreset = <
  Name extends string,
  Input,
  Output extends AnyPresetOutput,
>(
  preset: Preset<Name, Input, Output>,
) => preset;
