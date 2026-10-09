export interface ColorResult {
  rgb: string;
  hex: string;
  hsl: string;
  hsv: string;
  cmyk: string;
  pixelCount: number;
  coverage: number;
  foreground: string;
  name: string;
  wcagContrastWhite: number;
  wcagContrastBlack: number;
  isLight: boolean;
}

export interface ImageMeta {
  name: string;
  size: number;
  formattedSize: string;
  dimensions: string;
  width: number;
  height: number;
  visiblePixels: number;
  totalPixels: number;
  format: string;
}

export interface ColorHarmony {
  title: string;
  type: 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'split-complementary' | 'monochromatic';
  description: string;
  colors: { hex: string; label: string; name: string; foreground: string }[];
}

export interface ColorScaleItem {
  hex: string;
  rgb: string;
  level: string; // e.g., "50", "100", ..., "900", "+20% White", "+40% Black"
  name: string;
  foreground: string;
  isBase?: boolean;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}

export interface ExtractionSettings {
  colorCount: number;
  clusterTolerance: number;
}

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  svgData: string;
}

export interface ThemePaletteToken {
  id: string;
  role: 'primary' | 'secondary' | 'accent' | 'ui-tone' | 'neutral-bg' | 'neutral-structural';
  label: string;
  badge: string;
  description: string;
  recommendedUse: string;
  color: ColorResult;
  sourceIndex?: number;
}

export interface WebsiteThemePalette {
  primary: ColorResult;
  secondary: ColorResult;
  accent: ColorResult;
  uiTone: ColorResult;
  neutralBg: ColorResult;
  neutralStructural: ColorResult;
  tokens: ThemePaletteToken[];
}
