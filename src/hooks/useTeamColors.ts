import { useTheme } from "next-themes";

/**
 * Formats a team color and adjusts it for dark mode if needed.
 * In dark mode, colors are lightened to improve visibility.
 *
 * @param color - The team color (may or may not have # prefix)
 * @param isDarkMode - Whether dark mode is active
 * @returns Formatted color with # prefix, lightened if in dark mode
 */
function formatTeamColor(
  color: string | undefined,
  isDarkMode: boolean,
): string | undefined {
  if (!color) return undefined;

  // Ensure color has # prefix
  const hex = color.startsWith("#") ? color.slice(1) : color;
  if (hex.length !== 6) return `#${hex}`; // Invalid hex, return as-is

  // Convert hex to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Lighten color in dark mode by blending with white
  if (isDarkMode) {
    // Blend with white (255, 255, 255) using a 40% white blend
    // This lightens the color while preserving its hue
    const blendFactor = 0.4;
    r = Math.round(r + (255 - r) * blendFactor);
    g = Math.round(g + (255 - g) * blendFactor);
    b = Math.round(b + (255 - b) * blendFactor);
  }

  // Convert back to hex
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Hook to format team colors with dark mode support.
 * Returns a function that formats colors and adjusts them for dark mode.
 *
 * @example
 * ```tsx
 * const formatTeamColor = useTeamColors();
 * const homeColor = formatTeamColor(gameScore?.homeTeamColor);
 * ```
 */
export function useTeamColors() {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  return (color: string | undefined) => formatTeamColor(color, isDarkMode);
}

