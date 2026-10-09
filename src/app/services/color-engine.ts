import {
  ColorHarmony,
  ColorResult,
  ColorScaleItem,
  ThemePaletteToken,
  WebsiteThemePalette
} from '../models/color.model';

// Curated list of distinct color references for smart naming
const COLOR_DICTIONARY: { name: string; r: number; g: number; b: number }[] = [
  { name: 'Pure Obsidian', r: 15, g: 23, b: 42 },
  { name: 'Midnight Charcoal', r: 30, g: 41, b: 59 },
  { name: 'Slate Gray', r: 100, g: 116, b: 139 },
  { name: 'Pure White', r: 255, g: 255, b: 255 },
  { name: 'Cloud Mist', r: 241, g: 245, b: 249 },
  { name: 'Electric Indigo', r: 99, g: 102, b: 241 },
  { name: 'Royal Violet', r: 139, g: 92, b: 246 },
  { name: 'Deep Purple', r: 168, g: 85, b: 247 },
  { name: 'Neon Fuchsia', r: 217, g: 70, b: 239 },
  { name: 'Vibrant Magenta', r: 236, g: 72, b: 153 },
  { name: 'Rose Petal', r: 244, g: 63, b: 94 },
  { name: 'Crimson Red', r: 239, g: 68, b: 68 },
  { name: 'Fire Orange', r: 249, g: 115, b: 22 },
  { name: 'Amber Gold', r: 245, g: 158, b: 11 },
  { name: 'Solar Yellow', r: 234, g: 179, b: 8 },
  { name: 'Lime Zest', r: 132, g: 204, b: 22 },
  { name: 'Emerald Mint', r: 16, g: 185, b: 129 },
  { name: 'Teal Lagoon', r: 20, g: 184, b: 166 },
  { name: 'Cyan Sky', r: 6, g: 182, b: 212 },
  { name: 'Cobalt Blue', r: 14, g: 165, b: 233 },
  { name: 'Deep Sapphire', r: 59, g: 130, b: 246 },
  { name: 'Ultramarine', r: 79, g: 70, b: 229 },
  { name: 'Warm Bronze', r: 180, g: 83, b: 9 },
  { name: 'Forest Moss', r: 21, g: 128, b: 61 },
  { name: 'Nordic Frost', r: 224, g: 242, b: 254 },
  { name: 'Coral Sunset', r: 251, g: 113, b: 133 },
  { name: 'Lavish Plum', r: 126, g: 34, b: 206 },
  { name: 'Marine Navy', r: 30, g: 58, b: 138 }
];

export class ColorEngine {
  /**
   * Find closest human-readable name for a given RGB
   */
  static getColorName(r: number, g: number, b: number): string {
    let closestName = 'Custom Tint';
    let minDistance = Infinity;

    for (const item of COLOR_DICTIONARY) {
      const dr = r - item.r;
      const dg = g - item.g;
      const db = b - item.b;
      const distance = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
      if (distance < minDistance) {
        minDistance = distance;
        closestName = item.name;
      }
    }
    return closestName;
  }

  /**
   * Helper to mix two RGB colors
   */
  static mixRgb(
    rgb1: { r: number; g: number; b: number },
    rgb2: { r: number; g: number; b: number },
    weight: number // 0 to 1 (weight of rgb2)
  ): { r: number; g: number; b: number } {
    return {
      r: Math.round(rgb1.r * (1 - weight) + rgb2.r * weight),
      g: Math.round(rgb1.g * (1 - weight) + rgb2.g * weight),
      b: Math.round(rgb1.b * (1 - weight) + rgb2.b * weight)
    };
  }

  /**
   * Get optimal readable text color (white or dark slate) for a given RGB
   */
  static getForegroundForRgb(r: number, g: number, b: number): string {
    const lum = this.getLuminance(r, g, b);
    return lum > 0.45 ? '#0f172a' : '#ffffff';
  }

  /**
   * Converts RGB values to full ColorResult with advanced spaces
   */
  static buildColorResult(
    r: number,
    g: number,
    b: number,
    pixelCount: number,
    visiblePixels: number
  ): ColorResult {
    const hex = this.rgbToHex(r, g, b);
    const { hsl, hsv } = this.toHslAndHsv(r, g, b);
    const cmyk = this.toCmyk(r, g, b);
    const name = this.getColorName(r, g, b);

    const lum = this.getLuminance(r, g, b);
    const lumWhite = 1.0;
    const lumBlack = 0.0;

    const contrastWithWhite = (lumWhite + 0.05) / (lum + 0.05);
    const contrastWithBlack = (lum + 0.05) / (lumBlack + 0.05);

    const isLight = lum > 0.45;
    const foreground = isLight ? '#0f172a' : '#ffffff';
    const coverage = visiblePixels > 0 ? (pixelCount / visiblePixels) * 100 : 0;

    return {
      rgb: `${r}, ${g}, ${b}`,
      hex,
      hsl,
      hsv,
      cmyk,
      pixelCount,
      coverage,
      foreground,
      name,
      wcagContrastWhite: Number(contrastWithWhite.toFixed(2)),
      wcagContrastBlack: Number(contrastWithBlack.toFixed(2)),
      isLight
    };
  }

  static rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    );
  }

  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  static toHslAndHsv(
    r: number,
    g: number,
    b: number
  ): { hsl: string; hsv: string; h: number; sHsl: number; lHsl: number } {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    const lightness = (max + min) / 2;
    const value = max;
    const saturationHsv = max === 0 ? 0 : delta / max;
    const saturationHsl = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
    let hue = 0;

    if (delta !== 0) {
      if (max === red) hue = ((green - blue) / delta) % 6;
      else if (max === green) hue = (blue - red) / delta + 2;
      else hue = (red - green) / delta + 4;
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
    }

    return {
      hsl: `${hue}°, ${Math.round(saturationHsl * 100)}%, ${Math.round(lightness * 100)}%`,
      hsv: `${hue}°, ${Math.round(saturationHsv * 100)}%, ${Math.round(value * 100)}%`,
      h: hue,
      sHsl: saturationHsl,
      lHsl: lightness
    };
  }

  static toCmyk(r: number, g: number, b: number): string {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const k = 1 - Math.max(red, green, blue);
    if (k === 1) return '0%, 0%, 0%, 100%';
    const c = Math.round(((1 - red - k) / (1 - k)) * 100);
    const m = Math.round(((1 - green - k) / (1 - k)) * 100);
    const y = Math.round(((1 - blue - k) / (1 - k)) * 100);
    const kPercent = Math.round(k * 100);
    return `${c}%, ${m}%, ${y}%, ${kPercent}%`;
  }

  static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1 = 0,
      g1 = 0,
      b1 = 0;

    if (h >= 0 && h < 60) {
      r1 = c;
      g1 = x;
      b1 = 0;
    } else if (h >= 60 && h < 120) {
      r1 = x;
      g1 = c;
      b1 = 0;
    } else if (h >= 120 && h < 180) {
      r1 = 0;
      g1 = c;
      b1 = x;
    } else if (h >= 180 && h < 240) {
      r1 = 0;
      g1 = x;
      b1 = c;
    } else if (h >= 240 && h < 300) {
      r1 = x;
      g1 = 0;
      b1 = c;
    } else {
      r1 = c;
      g1 = 0;
      b1 = x;
    }

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  static getLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  /**
   * Generates Tints by progressively blending base color with Pure White (#FFFFFF)
   */
  static generateTints(baseHex: string): ColorScaleItem[] {
    const baseRgb = this.hexToRgb(baseHex);
    const white = { r: 255, g: 255, b: 255 };
    const percentages = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

    const tints: ColorScaleItem[] = percentages.map((pct) => {
      const mixed = this.mixRgb(baseRgb, white, pct);
      const hex = this.rgbToHex(mixed.r, mixed.g, mixed.b);
      return {
        hex,
        rgb: `${mixed.r}, ${mixed.g}, ${mixed.b}`,
        level: `+${Math.round(pct * 100)}% White`,
        name: this.getColorName(mixed.r, mixed.g, mixed.b),
        foreground: this.getForegroundForRgb(mixed.r, mixed.g, mixed.b)
      };
    });

    return [
      {
        hex: baseHex,
        rgb: `${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}`,
        level: 'Base (0%)',
        name: this.getColorName(baseRgb.r, baseRgb.g, baseRgb.b),
        foreground: this.getForegroundForRgb(baseRgb.r, baseRgb.g, baseRgb.b),
        isBase: true
      },
      ...tints
    ];
  }

  /**
   * Generates Shades by progressively blending base color with Pure Black (#000000)
   */
  static generateShades(baseHex: string): ColorScaleItem[] {
    const baseRgb = this.hexToRgb(baseHex);
    const black = { r: 0, g: 0, b: 0 };
    const percentages = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

    const shades: ColorScaleItem[] = percentages.map((pct) => {
      const mixed = this.mixRgb(baseRgb, black, pct);
      const hex = this.rgbToHex(mixed.r, mixed.g, mixed.b);
      return {
        hex,
        rgb: `${mixed.r}, ${mixed.g}, ${mixed.b}`,
        level: `+${Math.round(pct * 100)}% Black`,
        name: this.getColorName(mixed.r, mixed.g, mixed.b),
        foreground: this.getForegroundForRgb(mixed.r, mixed.g, mixed.b)
      };
    });

    return [
      {
        hex: baseHex,
        rgb: `${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}`,
        level: 'Base (0%)',
        name: this.getColorName(baseRgb.r, baseRgb.g, baseRgb.b),
        foreground: this.getForegroundForRgb(baseRgb.r, baseRgb.g, baseRgb.b),
        isBase: true
      },
      ...shades
    ];
  }

  /**
   * Generates Tones by progressively blending base color with Neutral Mid-Gray (#808080)
   */
  static generateTones(baseHex: string): ColorScaleItem[] {
    const baseRgb = this.hexToRgb(baseHex);
    const gray = { r: 128, g: 128, b: 128 };
    const percentages = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

    const tones: ColorScaleItem[] = percentages.map((pct) => {
      const mixed = this.mixRgb(baseRgb, gray, pct);
      const hex = this.rgbToHex(mixed.r, mixed.g, mixed.b);
      return {
        hex,
        rgb: `${mixed.r}, ${mixed.g}, ${mixed.b}`,
        level: `+${Math.round(pct * 100)}% Gray`,
        name: this.getColorName(mixed.r, mixed.g, mixed.b),
        foreground: this.getForegroundForRgb(mixed.r, mixed.g, mixed.b)
      };
    });

    return [
      {
        hex: baseHex,
        rgb: `${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}`,
        level: 'Base (0%)',
        name: this.getColorName(baseRgb.r, baseRgb.g, baseRgb.b),
        foreground: this.getForegroundForRgb(baseRgb.r, baseRgb.g, baseRgb.b),
        isBase: true
      },
      ...tones
    ];
  }

  /**
   * Generates a complete 10-step UI Design System Palette (50 to 950)
   */
  static generateDesignScale(baseHex: string): ColorScaleItem[] {
    const baseRgb = this.hexToRgb(baseHex);
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 15, g: 23, b: 42 };

    const scaleMap: { level: string; mixWith: 'white' | 'black' | 'base'; weight: number }[] = [
      { level: '50', mixWith: 'white', weight: 0.92 },
      { level: '100', mixWith: 'white', weight: 0.8 },
      { level: '200', mixWith: 'white', weight: 0.62 },
      { level: '300', mixWith: 'white', weight: 0.42 },
      { level: '400', mixWith: 'white', weight: 0.2 },
      { level: '500', mixWith: 'base', weight: 0 }, // Exact Base
      { level: '600', mixWith: 'black', weight: 0.18 },
      { level: '700', mixWith: 'black', weight: 0.38 },
      { level: '800', mixWith: 'black', weight: 0.58 },
      { level: '900', mixWith: 'black', weight: 0.76 },
      { level: '950', mixWith: 'black', weight: 0.88 }
    ];

    return scaleMap.map((item) => {
      let mixed = baseRgb;
      if (item.mixWith === 'white') {
        mixed = this.mixRgb(baseRgb, white, item.weight);
      } else if (item.mixWith === 'black') {
        mixed = this.mixRgb(baseRgb, black, item.weight);
      }
      const hex = this.rgbToHex(mixed.r, mixed.g, mixed.b);
      return {
        hex,
        rgb: `${mixed.r}, ${mixed.g}, ${mixed.b}`,
        level: item.level,
        name: this.getColorName(mixed.r, mixed.g, mixed.b),
        foreground: this.getForegroundForRgb(mixed.r, mixed.g, mixed.b),
        isBase: item.mixWith === 'base'
      };
    });
  }

  /**
   * Generates intelligent color harmonies for any given base color
   */
  static generateHarmonies(baseHex: string): ColorHarmony[] {
    const { r, g, b } = this.hexToRgb(baseHex);
    const { h, sHsl, lHsl } = this.toHslAndHsv(r, g, b);

    const makeColorItem = (deg: number, sMod = sHsl, lMod = lHsl, label: string) => {
      const rgb = this.hslToRgb(
        (h + deg) % 360,
        Math.max(0.1, Math.min(1, sMod)),
        Math.max(0.08, Math.min(0.95, lMod))
      );
      const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
      return {
        hex,
        label,
        name: this.getColorName(rgb.r, rgb.g, rgb.b),
        foreground: this.getForegroundForRgb(rgb.r, rgb.g, rgb.b)
      };
    };

    const baseItem = {
      hex: baseHex,
      label: 'Base',
      name: this.getColorName(r, g, b),
      foreground: this.getForegroundForRgb(r, g, b)
    };

    return [
      {
        title: 'Complementary',
        type: 'complementary',
        description: 'Directly opposite on the 360° color wheel (+180°), creates maximum visual contrast and energetic pop.',
        colors: [baseItem, makeColorItem(180, sHsl, lHsl, 'Complement (+180°)')]
      },
      {
        title: 'Analogous Flow',
        type: 'analogous',
        description: 'Adjacent hues on the color wheel (±30°), producing a harmonious, soothing, and natural palette.',
        colors: [
          makeColorItem(-30, sHsl, lHsl, '-30° Analogous'),
          baseItem,
          makeColorItem(30, sHsl, lHsl, '+30° Analogous')
        ]
      },
      {
        title: 'Triadic Harmony',
        type: 'triadic',
        description: 'Equidistant triangle around the color wheel (+120°, +240°), delivering rich diversity with balanced energy.',
        colors: [
          baseItem,
          makeColorItem(120, sHsl, lHsl, '+120° Triad'),
          makeColorItem(240, sHsl, lHsl, '+240° Triad')
        ]
      },
      {
        title: 'Tetradic / Rectangle',
        type: 'tetradic',
        description: 'Four colors arranged into two complementary pairs (+90°, +180°, +270°), offering maximum color richness.',
        colors: [
          baseItem,
          makeColorItem(90, sHsl, lHsl, '+90° Square'),
          makeColorItem(180, sHsl, lHsl, '+180° Oppose'),
          makeColorItem(270, sHsl, lHsl, '+270° Square')
        ]
      },
      {
        title: 'Split-Complementary',
        type: 'split-complementary',
        description: 'Base color paired with the two colors adjacent to its complement (+150° and +210°).',
        colors: [
          baseItem,
          makeColorItem(150, sHsl, lHsl, '+150° Split'),
          makeColorItem(210, sHsl, lHsl, '+210° Split')
        ]
      }
    ];
  }

  /**
   * Helper to construct a synthetic ColorResult from HSL coordinates
   */
  static createSyntheticColor(h: number, s: number, l: number, name: string): ColorResult {
    const rgb = this.hslToRgb(h, s, l);
    const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
    const { hsl, hsv } = this.toHslAndHsv(rgb.r, rgb.g, rgb.b);
    const cmyk = this.toCmyk(rgb.r, rgb.g, rgb.b);
    const lum = this.getLuminance(rgb.r, rgb.g, rgb.b);
    const contrastWithWhite = (1.0 + 0.05) / (lum + 0.05);
    const contrastWithBlack = (lum + 0.05) / (0.0 + 0.05);
    const isLight = lum > 0.45;
    const foreground = isLight ? '#0f172a' : '#ffffff';

    return {
      rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      hex,
      hsl,
      hsv,
      cmyk,
      pixelCount: 0,
      coverage: 0,
      foreground,
      name,
      wcagContrastWhite: Number(contrastWithWhite.toFixed(2)),
      wcagContrastBlack: Number(contrastWithBlack.toFixed(2)),
      isLight
    };
  }

  /**
   * Generates a curated 6-token Website Theme Palette tailored for website development
   * Includes Top 3 shades, 1 Brand UI Gray Tone (for buttons/menus), and 2 harmonized neutral gray shades (Canvas and Structural).
   */
  static generateWebsiteThemePalette(
    colors: ColorResult[],
    uiToneSourceIndex: number = 0
  ): WebsiteThemePalette | null {
    if (!colors || colors.length === 0) return null;

    // 1. Primary Dominant Brand Color
    const primary = colors[0];
    const primaryRgb = this.hexToRgb(primary.hex);
    const { h: hPrimary, sHsl: sPrimary, lHsl: lPrimary } = this.toHslAndHsv(primaryRgb.r, primaryRgb.g, primaryRgb.b);

    // 2. Secondary Color (extracted #2 or harmonious fallback)
    let secondary: ColorResult;
    if (colors.length > 1) {
      secondary = colors[1];
    } else {
      const fallbackHue = sPrimary > 0.08 ? (hPrimary + 35) % 360 : 215;
      secondary = this.createSyntheticColor(fallbackHue, Math.max(0.4, sPrimary), 0.5, 'Secondary Accent');
    }

    // 3. Accent Color (extracted #3 or triad/complement fallback)
    let accent: ColorResult;
    if (colors.length > 2) {
      accent = colors[2];
    } else {
      const fallbackHue = sPrimary > 0.08 ? (hPrimary + 180) % 360 : 45;
      accent = this.createSyntheticColor(fallbackHue, Math.max(0.5, sPrimary), 0.55, 'Accent Pop');
    }

    // Determine the source brand color for the UI Gray Tone
    const topThree = [primary, secondary, accent];
    const safeSourceIndex = Math.max(0, Math.min(topThree.length - 1, uiToneSourceIndex));
    const sourceForUiTone = topThree[safeSourceIndex];
    const sourceRgb = this.hexToRgb(sourceForUiTone.hex);
    const { h: hSource, sHsl: sSource, lHsl: lSource } = this.toHslAndHsv(sourceRgb.r, sourceRgb.g, sourceRgb.b);

    // Check if the source color has perceptible chromatic saturation
    const isSourceChromatic = sSource > 0.08;
    
    // Find the most vibrant chromatic color in the logo for neutral fallback inheritance
    const mostChromaticInLogo = topThree
      .map((c) => {
        const rgb = this.hexToRgb(c.hex);
        return { color: c, hsl: this.toHslAndHsv(rgb.r, rgb.g, rgb.b) };
      })
      .filter((item) => item.hsl.sHsl > 0.08)
      .sort((a, b) => b.hsl.sHsl - a.hsl.sHsl)[0];

    // Determine the active hue angle:
    // 1. If chosen source is chromatic, use its exact hue.
    // 2. If chosen source is neutral/black/white, but logo has another brand color, inherit that brand hue.
    // 3. If entire logo is monochromatic/black/white, use 215° (Clean Modern Slate).
    let activeUiHue = 215;
    let activeUiSat = 0.06;
    let activeUiLightness = 0.89;

    if (isSourceChromatic) {
      activeUiHue = hSource;
      // Proportional saturation: 22% - 38% based on source vibrancy
      activeUiSat = Math.max(0.20, Math.min(0.38, sSource * 0.45));
      // Calibrated lightness for distinct button & menu surface: 82% - 88%
      activeUiLightness = Math.max(0.82, Math.min(0.88, 0.84 + (lSource - 0.5) * 0.08));
    } else if (mostChromaticInLogo) {
      activeUiHue = mostChromaticInLogo.hsl.h;
      activeUiSat = Math.max(0.16, Math.min(0.28, mostChromaticInLogo.hsl.sHsl * 0.35));
      activeUiLightness = 0.88;
    }

    // 4. Brand UI Gray Tone (for buttons or menu backgrounds)
    const uiTone = this.createSyntheticColor(
      activeUiHue,
      activeUiSat,
      activeUiLightness,
      isSourceChromatic ? `${sourceForUiTone.name} UI Tone` : 'Harmonized Slate UI Tone'
    );

    // 5. Theme Neutral Light (Page canvas / surface gray)
    const activeCanvasHue = isSourceChromatic ? hSource : (mostChromaticInLogo ? mostChromaticInLogo.hsl.h : 215);
    const canvasSat = (isSourceChromatic || mostChromaticInLogo) ? 0.08 : 0.04;
    const neutralBg = this.createSyntheticColor(
      activeCanvasHue,
      canvasSat,
      0.968,
      'Harmonized Canvas Gray'
    );

    // 6. Theme Neutral Dark (Structural borders, dividers & muted text)
    const activeBorderHue = isSourceChromatic ? hSource : (mostChromaticInLogo ? mostChromaticInLogo.hsl.h : 215);
    const borderSat = (isSourceChromatic || mostChromaticInLogo) ? 0.16 : 0.10;
    const neutralStructural = this.createSyntheticColor(
      activeBorderHue,
      borderSat,
      0.26,
      'Harmonized Structural Gray'
    );

    const tokens: ThemePaletteToken[] = [
      {
        id: 'token-primary',
        role: 'primary',
        label: 'Primary Dominant Brand',
        badge: 'BRAND DOMINANT',
        description: 'Extracted #1 dominant color with maximum visual hierarchy.',
        recommendedUse: 'Hero call-to-action buttons, primary logo presence, header branding & key focal points.',
        color: primary,
        sourceIndex: 0
      },
      {
        id: 'token-secondary',
        role: 'secondary',
        label: 'Secondary Brand Shade',
        badge: 'BRAND SECONDARY',
        description: 'Extracted #2 color providing thematic visual balance.',
        recommendedUse: 'Sub-navigation, secondary tags, feature icons, and complementary section headers.',
        color: secondary,
        sourceIndex: 1
      },
      {
        id: 'token-accent',
        role: 'accent',
        label: 'Accent Highlight Shade',
        badge: 'BRAND ACCENT',
        description: 'Extracted #3 color for high-visibility interactive triggers.',
        recommendedUse: 'Notification badges, rating stars, alert banners, and interactive hover highlights.',
        color: accent,
        sourceIndex: 2
      },
      {
        id: 'token-ui-tone',
        role: 'ui-tone',
        label: 'Brand UI Gray Tone',
        badge: 'BUTTONS & MENU BG',
        description: `Desaturated tone derived from #${safeSourceIndex + 1} (${sourceForUiTone.name}).`,
        recommendedUse: 'Top navigation bar background, secondary button surfaces, dropdown panels & search bars.',
        color: uiTone,
        sourceIndex: safeSourceIndex
      },
      {
        id: 'token-neutral-bg',
        role: 'neutral-bg',
        label: 'Theme Neutral Canvas',
        badge: 'PAGE CANVAS & SURFACE',
        description: 'Subtle logo-harmonized light gray preventing sterile pure white.',
        recommendedUse: 'Website body canvas, section background panels, cards, and modal containers.',
        color: neutralBg
      },
      {
        id: 'token-neutral-structural',
        role: 'neutral-structural',
        label: 'Theme Neutral Structural',
        badge: 'BORDERS & MUTED TEXT',
        description: 'Deep logo-harmonized slate gray for structured UI hierarchy.',
        recommendedUse: 'Card borders, container dividers, subtle input outlines, footer backgrounds, and secondary typography.',
        color: neutralStructural
      }
    ];

    return {
      primary,
      secondary,
      accent,
      uiTone,
      neutralBg,
      neutralStructural,
      tokens
    };
  }

  /**
   * Generates code exports in multiple formats
   */
  static exportPalette(
    colors: ColorResult[],
    format: 'css' | 'tailwind' | 'json' | 'scss',
    themePalette?: WebsiteThemePalette | null
  ): string {
    if (!colors.length) return '';

    if (format === 'css') {
      let themeTokens = '';
      if (themePalette) {
        themeTokens = `  /* =================================================================
     Website Theme Semantic Tokens (Tailored for Logo & Branding)
     ================================================================= */
  --brand-primary: ${themePalette.primary.hex};            /* #1 Dominant Brand Color */
  --brand-secondary: ${themePalette.secondary.hex};        /* #2 Secondary Brand Color */
  --brand-accent: ${themePalette.accent.hex};              /* #3 Accent Highlight Color */
  --brand-ui-tone: ${themePalette.uiTone.hex};             /* UI Tone for Buttons & Menus */
  --theme-neutral-bg: ${themePalette.neutralBg.hex};       /* Harmonized Canvas & Page Background */
  --theme-neutral-border: ${themePalette.neutralStructural.hex}; /* Harmonized Structural Borders & Text */\n\n  /* --- Raw Extracted Palette --- */\n`;
      }

      const vars = colors
        .map((c, i) => `  --brand-color-${i + 1}: ${c.hex}; /* ${c.name} (${c.coverage.toFixed(1)}%) */`)
        .join('\n');
      return `:root {\n${themeTokens}${vars}\n}`;
    }

    if (format === 'tailwind') {
      const brandColors: Record<string, string> = {};
      if (themePalette) {
        brandColors['primary'] = themePalette.primary.hex;
        brandColors['secondary'] = themePalette.secondary.hex;
        brandColors['accent'] = themePalette.accent.hex;
        brandColors['ui-tone'] = themePalette.uiTone.hex;
        brandColors['neutral-bg'] = themePalette.neutralBg.hex;
        brandColors['neutral-border'] = themePalette.neutralStructural.hex;
      }
      colors.forEach((c, i) => {
        const key = i === 0 ? 'dominant' : i === 1 ? 'secondary' : i === 2 ? 'accent' : `shade${i + 1}`;
        brandColors[key] = c.hex;
      });

      return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        brand: ${JSON.stringify(brandColors, null, 8).replace(/\n\s*}/, '\n      }')}\n      }\n    }\n  }\n};`;
    }

    if (format === 'scss') {
      let themeVars = '';
      if (themePalette) {
        themeVars = `// Website Theme Semantic Variables\n$brand-primary: ${themePalette.primary.hex};\n$brand-secondary: ${themePalette.secondary.hex};\n$brand-accent: ${themePalette.accent.hex};\n$brand-ui-tone: ${themePalette.uiTone.hex}; // Buttons & Menu Backgrounds\n$theme-neutral-bg: ${themePalette.neutralBg.hex}; // Page Canvas\n$theme-neutral-border: ${themePalette.neutralStructural.hex}; // Structural Borders\n\n// Raw Extracted Palette\n`;
      }
      const rawVars = colors
        .map((c, i) => `$brand-color-${i + 1}: ${c.hex}; // ${c.name}`)
        .join('\n');
      return `${themeVars}${rawVars}`;
    }

    if (format === 'json') {
      return JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          websiteThemePalette: themePalette
            ? {
                primary: themePalette.primary.hex,
                secondary: themePalette.secondary.hex,
                accent: themePalette.accent.hex,
                brandUiTone: themePalette.uiTone.hex,
                themeNeutralCanvas: themePalette.neutralBg.hex,
                themeNeutralStructural: themePalette.neutralStructural.hex,
                tokens: themePalette.tokens.map((t) => ({
                  role: t.role,
                  label: t.label,
                  hex: t.color.hex,
                  rgb: t.color.rgb,
                  recommendedUse: t.recommendedUse
                }))
              }
            : null,
          allExtractedColors: colors.map((c, i) => ({
            rank: i + 1,
            name: c.name,
            hex: c.hex,
            rgb: c.rgb,
            hsl: c.hsl,
            hsv: c.hsv,
            cmyk: c.cmyk,
            coveragePercent: Number(c.coverage.toFixed(2)),
            pixelCount: c.pixelCount
          }))
        },
        null,
        2
      );
    }

    return '';
  }

  /**
   * Generates a sleek SVG Swatch Card for instant graphic download (Adaptive grid for any number of colors)
   */
  static generateSvgCard(fileName: string, colors: ColorResult[]): string {
    if (!colors.length) return '';

    // Calculate grid columns and rows dynamically based on color count
    const count = colors.length;
    let cols = count <= 4 ? count : count <= 8 ? 4 : count <= 12 ? 6 : 6;
    cols = Math.max(1, cols);
    const rows = Math.ceil(count / cols);

    const cardWidth = count <= 4 ? 160 : 130;
    const cardHeight = 160;
    const gap = 16;
    const padding = 28;
    const headerHeight = 85;
    const footerHeight = 45;

    const width = Math.max(680, padding * 2 + cols * cardWidth + (cols - 1) * gap);
    const height = padding * 2 + headerHeight + rows * cardHeight + (rows - 1) * gap + footerHeight;

    let swatchesSvg = '';
    colors.forEach((c, idx) => {
      const colIdx = idx % cols;
      const rowIdx = Math.floor(idx / cols);
      const x = padding + colIdx * (cardWidth + gap);
      const y = padding + headerHeight + rowIdx * (cardHeight + gap);

      swatchesSvg += `
        <g transform="translate(${x}, ${y})">
          <rect width="${cardWidth}" height="${cardHeight}" rx="14" fill="${c.hex}" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.18))" />
          <rect y="${cardHeight - 68}" width="${cardWidth}" height="68" rx="0" fill="rgba(15,23,42,0.72)" />
          <text x="10" y="${cardHeight - 48}" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="13" fill="#ffffff">${c.hex}</text>
          <text x="10" y="${cardHeight - 32}" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="rgba(255,255,255,0.75)">${c.coverage.toFixed(1)}% Coverage</text>
          <text x="10" y="${cardHeight - 16}" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" fill="rgba(255,255,255,0.9)">${c.name}</text>
          <rect x="8" y="8" width="50" height="20" rx="6" fill="rgba(15,23,42,0.65)" />
          <text x="14" y="22" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="9.5" fill="#ffffff">#${idx + 1}</text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" rx="24" fill="url(#bgGrad)" />
        <text x="${padding}" y="${padding + 28}" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="22" fill="#ffffff">Logo Color Palette</text>
        <text x="${padding}" y="${padding + 52}" font-family="'Plus Jakarta Sans', sans-serif" font-size="12.5" fill="#94a3b8">Extracted from: ${fileName} • All ${colors.length} Extracted Colors</text>
        ${swatchesSvg}
        <text x="${padding}" y="${height - 20}" font-family="'JetBrains Mono', monospace" font-size="11" fill="#64748b">Generated by Logo Color Extractor • Precision Color Intelligence</text>
      </svg>
    `.trim();
  }
}
