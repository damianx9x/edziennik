export const SCHEDULE_TONE_COUNT = 6;

export function getScheduleTone(resourceId: string): number {
  let hash = 0;
  for (const character of resourceId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % SCHEDULE_TONE_COUNT;
}
