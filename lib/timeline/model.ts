export type TimelineFrame = {
  time: string; // ISO
  label: string;
  tileUrl?: string;
  ageMinutes?: number;
};

export type TimelineState = {
  frames: TimelineFrame[];
  index: number;
  playing: boolean;
  speedMs: number;
  loopAvailable: boolean;
};

export function clampFrameIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

export function stepFrameIndex(index: number, dir: -1 | 1, length: number) {
  if (length <= 0) return 0;
  const next = index + dir;
  if (next < 0) return length - 1;
  if (next >= length) return 0;
  return next;
}

export function getFrameAt(frames: TimelineFrame[], index: number): TimelineFrame | null {
  if (!frames.length) return null;
  return frames[clampFrameIndex(index, frames.length)] || null;
}
