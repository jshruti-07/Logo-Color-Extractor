import { Injectable, signal } from '@angular/core';
import { WebsiteThemePalette } from '../models/color.model';
import { DEFAULT_DASHBOARD_THEME, DashboardTheme } from '../models/theme.model';

const STORAGE_KEY = 'logo_color_extractor_theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly currentTheme = signal<DashboardTheme>(DEFAULT_DASHBOARD_THEME);
  readonly notificationMessage = signal<string | null>(null);
  readonly isThemeReady = signal<boolean>(false);

  constructor() {
    this.initTheme();
  }

  /**
   * Initializes theme on application startup: loads and validates persisted theme
   */
  private initTheme(): void {
    const loadedTheme = this.loadPersistedTheme();
    this.currentTheme.set(loadedTheme);
    this.applyCssVariables(loadedTheme);
    if (loadedTheme.isCustom) {
      this.isThemeReady.set(true);
    }
  }

  /**
   * Transforms an extracted WebsiteThemePalette into a complete DashboardTheme,
   * saves it to localStorage, marks it ready, and applies CSS variables immediately.
   */
  applyPalette(palette: WebsiteThemePalette, logoName?: string): void {
    if (!palette) return;

    const brandName = logoName
      ? logoName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      : `${palette.primary.name} & ${palette.secondary.name}`;

    const newTheme: DashboardTheme = {
      name: `${brandName} Theme`,
      isCustom: true,
      primary: palette.primary.hex,
      secondary: palette.secondary.hex,
      accent: palette.accent.hex,
      background: palette.neutralBg.hex,
      surface: '#ffffff',
      text: '#0f172a',
      mutedText: '#64748b',
      border: '#e2e8f0',
      primaryForeground: palette.primary.foreground || '#ffffff',
      secondaryForeground: palette.secondary.foreground || '#ffffff',
      accentForeground: palette.accent.foreground || '#0f172a',
      uiTone: palette.uiTone.hex,
      neutralBg: palette.neutralBg.hex,
      neutralStructural: palette.neutralStructural.hex,
      logoName: logoName || 'Uploaded Logo',
      appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tokens: palette.tokens,
      rawPalette: {
        primary: palette.primary,
        secondary: palette.secondary,
        accent: palette.accent,
        uiTone: palette.uiTone,
        neutralBg: palette.neutralBg,
        neutralStructural: palette.neutralStructural
      }
    };

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTheme));
    } catch (e) {
      console.warn('Could not persist theme to localStorage', e);
    }

    // Update reactive state
    this.currentTheme.set(newTheme);
    this.isThemeReady.set(true);
    this.notificationMessage.set('Your logo theme has been applied to the Dashboard.');

    // Apply CSS custom properties immediately
    this.applyCssVariables(newTheme);
  }

  /**
   * Resets the dashboard back to the default theme
   */
  resetToDefault(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Could not remove theme from localStorage', e);
    }

    this.currentTheme.set(DEFAULT_DASHBOARD_THEME);
    this.isThemeReady.set(false);
    this.notificationMessage.set('Dashboard colors restored to default theme.');
    this.applyCssVariables(DEFAULT_DASHBOARD_THEME);
  }

  /**
   * Clears the current notification/confirmation message
   */
  clearNotification(): void {
    this.notificationMessage.set(null);
  }

  /**
   * Applies the required CSS custom properties to the document root or specified element
   */
  applyCssVariables(theme: DashboardTheme, element?: HTMLElement): void {
    const target = element || (typeof document !== 'undefined' ? document.documentElement : null);
    if (!target) return;

    // Core required CSS Custom Properties
    target.style.setProperty('--color-primary', theme.primary);
    target.style.setProperty('--color-secondary', theme.secondary);
    target.style.setProperty('--color-accent', theme.accent);
    target.style.setProperty('--color-background', theme.background);
    target.style.setProperty('--color-surface', theme.surface);
    target.style.setProperty('--color-text', theme.text);
    target.style.setProperty('--color-muted-text', theme.mutedText);
    target.style.setProperty('--color-border', theme.border);

    // Complementary functional properties for contrast & UI depth
    target.style.setProperty('--color-primary-foreground', theme.primaryForeground);
    target.style.setProperty('--color-secondary-foreground', theme.secondaryForeground);
    target.style.setProperty('--color-accent-foreground', theme.accentForeground);
    target.style.setProperty('--color-ui-tone', theme.uiTone);
    target.style.setProperty('--color-neutral-bg', theme.neutralBg);
    target.style.setProperty('--color-neutral-structural', theme.neutralStructural);
  }

  /**
   * Loads and validates stored theme from localStorage
   */
  private loadPersistedTheme(): DashboardTheme {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_DASHBOARD_THEME;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return DEFAULT_DASHBOARD_THEME;
      }

      const parsed = JSON.parse(stored) as Partial<DashboardTheme>;
      if (this.isValidTheme(parsed)) {
        return {
          ...DEFAULT_DASHBOARD_THEME,
          ...parsed,
          isCustom: true
        } as DashboardTheme;
      }
    } catch (e) {
      console.warn('Failed to parse persisted theme, falling back to default', e);
    }

    return DEFAULT_DASHBOARD_THEME;
  }

  /**
   * Validates color hex values of a candidate theme object
   */
  private isValidTheme(candidate: Partial<DashboardTheme>): boolean {
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    return !!(
      candidate &&
      typeof candidate.primary === 'string' &&
      hexRegex.test(candidate.primary) &&
      typeof candidate.secondary === 'string' &&
      hexRegex.test(candidate.secondary) &&
      typeof candidate.accent === 'string' &&
      hexRegex.test(candidate.accent)
    );
  }
}
