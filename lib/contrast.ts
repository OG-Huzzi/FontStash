function normalizeHex(hex: string) {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return clean.split('').map((char) => char + char).join('');
  }
  return clean.padEnd(6, '0').slice(0, 6);
}

function channelToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function getContrastRatio(foreground: string, background: string) {
  const fg = normalizeHex(foreground);
  const bg = normalizeHex(background);
  const fgRgb = [fg.slice(0, 2), fg.slice(2, 4), fg.slice(4, 6)].map((part) => parseInt(part, 16));
  const bgRgb = [bg.slice(0, 2), bg.slice(2, 4), bg.slice(4, 6)].map((part) => parseInt(part, 16));
  const fgLuminance = 0.2126 * channelToLinear(fgRgb[0]) + 0.7152 * channelToLinear(fgRgb[1]) + 0.0722 * channelToLinear(fgRgb[2]);
  const bgLuminance = 0.2126 * channelToLinear(bgRgb[0]) + 0.7152 * channelToLinear(bgRgb[1]) + 0.0722 * channelToLinear(bgRgb[2]);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastBadges(ratio: number) {
  return [
    { label: 'AA Normal', pass: ratio >= 4.5 },
    { label: 'AA Large', pass: ratio >= 3 },
    { label: 'AAA Normal', pass: ratio >= 7 },
    { label: 'AAA Large', pass: ratio >= 4.5 },
  ];
}
