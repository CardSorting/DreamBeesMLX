type DesktopTarget = 'mac' | 'windows' | 'linux';

const DOWNLOAD_PATHS: Record<DesktopTarget, string> = {
  mac: '/downloads/dreambees-lite-mac.dmg',
  windows: '/downloads/dreambees-lite-windows.exe',
  linux: '/downloads/dreambees-lite-linux.AppImage'
};

function detectDesktopTarget(userAgent: string): DesktopTarget | null {
  const normalized = userAgent.toLowerCase();
  if (normalized.includes('mac os') || normalized.includes('macintosh')) return 'mac';
  if (normalized.includes('win')) return 'windows';
  if (normalized.includes('linux')) return 'linux';
  return null;
}

export function getDesktopDownloadUrl(): string {
  if (typeof window === 'undefined') return '/downloads/';
  const target = detectDesktopTarget(window.navigator.userAgent);
  if (!target) return '/downloads/';
  return DOWNLOAD_PATHS[target];
}
