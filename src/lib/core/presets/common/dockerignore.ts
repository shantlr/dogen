import { DockerignoreOp } from '../../../dockerfile/types';

export const COMMON_DOCKERIGNORE: DockerignoreOp[] = [
  '**/.git',
  '**/.coverage',
  '**/.dockerignore',
  '**/.env',
  '**/.gitignore',
  '**/.vscode',
  '**/docker-compose*',
  '**/compose.y*ml',
  '**/Dockefile',
  'LICENSE',
  'README.md',
];
