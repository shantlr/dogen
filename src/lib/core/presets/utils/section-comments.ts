const BASE_LENGTH = 80;
export const sectionComment = (text: string): string[] => {
  const length = Math.max(BASE_LENGTH, text.length + 4);

  return [
    '#'.repeat(length),
    `#${' '.repeat(length - 2)}#`,
    `# ${text.padStart((length - 4) / 2 + text.length / 2, ' ').padEnd(length - 4, ' ')} #`,
    `#${' '.repeat(length - 2)}#`,
    '#'.repeat(length),
  ];
};
