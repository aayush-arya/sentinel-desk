const BROWSER_PATTERNS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Chrome\//, 'Chrome'],
  [/Firefox\//, 'Firefox'],
  [/Safari\//, 'Safari'],
];

const OS_PATTERNS: [RegExp, string][] = [
  [/Windows/, 'Windows'],
  [/Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
  [/Android/, 'Android'],
  [/iPhone|iPad/, 'iOS'],
];

/** Best-effort, dependency-free UA summary for the "active sessions" UI — not for security decisions. */
export function describeUserAgent(userAgent?: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser =
    BROWSER_PATTERNS.find(([re]) => re.test(userAgent))?.[1] ??
    'Unknown browser';
  const os =
    OS_PATTERNS.find(([re]) => re.test(userAgent))?.[1] ?? 'Unknown OS';
  return `${browser} on ${os}`;
}
