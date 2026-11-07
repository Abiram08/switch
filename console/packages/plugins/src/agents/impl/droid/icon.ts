import type { AgentIconAsset } from '@switch-console/core/agents/plugins';

/**
 * A neutral glyph, not Factory's mark: the vendor's logo has not been
 * confirmed as licensed for this use. Swap it for the official mark, and
 * credit it in NOTICE, once it is.
 */
export const icon: AgentIconAsset = {
  kind: 'svg',
  alt: 'Factory Droid CLI',
  invertInDark: true,
  variants: [
    {
      minSize: 0,
      light: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><title>Factory Droid</title><rect x="4" y="7" width="16" height="12" rx="3" stroke="#111" stroke-width="1.8"/><path d="M12 7V3.5M9.5 3.5h5" stroke="#111" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="13" r="1.4" fill="#111"/><circle cx="15" cy="13" r="1.4" fill="#111"/></svg>`,
    },
  ],
};
