import { ColorResult, ThemePaletteToken, WebsiteThemePalette } from './color.model';

export interface DashboardTheme {
  name: string;
  isCustom: boolean;
  primary: string;         // --color-primary
  secondary: string;       // --color-secondary
  accent: string;          // --color-accent
  background: string;      // --color-background
  surface: string;         // --color-surface
  text: string;            // --color-text
  mutedText: string;       // --color-muted-text
  border: string;          // --color-border

  // Additional semantic and contrast attributes
  primaryForeground: string;
  secondaryForeground: string;
  accentForeground: string;
  uiTone: string;
  neutralBg: string;
  neutralStructural: string;

  logoName?: string;
  appliedAt?: string;
  tokens?: ThemePaletteToken[];
  rawPalette?: {
    primary: ColorResult;
    secondary: ColorResult;
    accent: ColorResult;
    uiTone: ColorResult;
    neutralBg: ColorResult;
    neutralStructural: ColorResult;
  };
}

export const DEFAULT_DASHBOARD_THEME: DashboardTheme = {
  name: 'Default Modern Indigo Theme',
  isCustom: false,
  primary: '#4f46e5',
  secondary: '#06b6d4',
  accent: '#f59e0b',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  mutedText: '#64748b',
  border: '#e2e8f0',
  primaryForeground: '#ffffff',
  secondaryForeground: '#ffffff',
  accentForeground: '#0f172a',
  uiTone: '#e0e7ff',
  neutralBg: '#f8fafc',
  neutralStructural: '#334155',
  appliedAt: ''
};
