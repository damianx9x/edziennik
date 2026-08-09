export function getRetryDelayMinutes(attempts: number) {
  return Math.min(60, 2 ** Math.max(0, attempts));
}
