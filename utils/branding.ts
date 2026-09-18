// Helpers for the configurable app icon (see `appIcon` in config/index.ts).
export const isImageUrl = (icon: string): boolean =>
  /^(https?:)?\/\//.test(icon) || icon.startsWith('/') || icon.startsWith('data:')

// Emoji (or plain text) icons are turned into an inline SVG so that they can be
// used as a favicon as well as inside the app.
export const buildFaviconUrl = (icon: string): string =>
  isImageUrl(icon)
    ? icon
    : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icon}</text></svg>`)}`
