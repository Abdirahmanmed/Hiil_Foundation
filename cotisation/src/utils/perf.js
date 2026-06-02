export function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function roundDurationMs(start, end = nowMs()) {
  return Math.round((end - start) * 10) / 10;
}

export function logPerf(label, details = {}) {
  // Logs non sensibles: durées et compteurs uniquement, utiles temporairement en prod Render/Vercel.
  console.info(`[perf] ${label}`, details);
}
