const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function buildDistribution(diameters) {
  const sorted = [...diameters].sort((a, b) => a - b);
  const d10 = percentile(sorted, 0.1);
  const d50 = percentile(sorted, 0.5);
  const d80 = percentile(sorted, 0.8);
  const sieves = [10, 20, 30, 40, 50, 70, 100, 150, 200, 300, 400, 600, 800, 1000, 1500, 2000];
  const real = sieves.map((size) => ({ size, passing: sorted.filter((value) => value <= size).length / sorted.length * 100 }));
  const kuzRam = real.map((row) => ({ ...row, passing: clamp(100 * (1 - Math.exp(-Math.pow(row.size / (d50 || 1), 1.45))), 0, 100) }));
  const swebrec = real.map((row) => ({ ...row, passing: clamp(100 * (1 - Math.exp(-Math.pow(row.size / (d50 || 1), 1.25))), 0, 100) }));
  return { d10, d50, d80, real, kuzRam, swebrec, sorted };
}
