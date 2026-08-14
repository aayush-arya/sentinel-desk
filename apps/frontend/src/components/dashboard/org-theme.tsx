'use client';

import { useEffect } from 'react';

// Applies the organization's brand color as the --primary CSS variable so buttons,
// links, and focus rings across the dashboard reflect the tenant's own branding
// instead of SentinelDesk's default indigo. Scoped to the dashboard shell only - the
// public marketing/login pages are shared across tenants and stay brand-neutral.
export function OrgTheme({ primaryColor }: { primaryColor: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--primary');
    root.style.setProperty('--primary', primaryColor);
    return () => {
      if (previous) root.style.setProperty('--primary', previous);
      else root.style.removeProperty('--primary');
    };
  }, [primaryColor]);

  return null;
}
