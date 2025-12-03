export type Band = 'low' | 'medium' | 'high' | 'unknown' | 'pass' | 'fail';

export function bandEnergyResilience(value: number | null | undefined): Band {
  if (value === null || typeof value === 'undefined' || Number.isNaN(Number(value))) return 'unknown';
  const v = Number(value);
  if (v >= 75) return 'high';
  if (v >= 40) return 'medium';
  return 'low';
}

export function bandCompliance(value: any): Band {
  // compliance can be boolean or string
  if (value === true || String(value).toLowerCase() === 'pass' || String(value).toLowerCase() === 'compliant') return 'pass';
  if (value === false || String(value).toLowerCase() === 'fail' || String(value).toLowerCase() === 'non-compliant') return 'fail';
  return 'unknown';
}

export function bandForIndicator(indicatorId: string, value: any): Band {
  if (!indicatorId) return 'unknown';
  if (indicatorId === 'energy_resilience') return bandEnergyResilience(value);
  if (indicatorId === 'compliance_status') return bandCompliance(value);
  // Default heuristic: numeric -> low/medium/high
  if (typeof value === 'number' || (!isNaN(Number(value)) && value !== null && value !== undefined)) {
    const n = Number(value);
    if (n >= 75) return 'high';
    if (n >= 40) return 'medium';
    return 'low';
  }
  return 'unknown';
}

export function bandLabel(b: Band): string {
  switch (b) {
    case 'low': return 'Low';
    case 'medium': return 'Medium';
    case 'high': return 'High';
    case 'pass': return 'Pass';
    case 'fail': return 'Fail';
    default: return 'Unknown';
  }
}
