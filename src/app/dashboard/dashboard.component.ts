import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../services/theme.service';
import { DashboardTheme } from '../models/theme.model';

interface AssetTableItem {
  name: string;
  role: string;
  hex: string;
  cssVar: string;
  contrast: string;
  status: 'active' | 'harmonized' | 'core';
  usage: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  protected readonly themeService = inject(ThemeService);
  protected readonly router = inject(Router);

  // Reactive theme state directly from centralized ThemeService
  readonly currentTheme = this.themeService.currentTheme;
  readonly notification = this.themeService.notificationMessage;

  // Local component state
  readonly copiedHex = signal<string | null>(null);
  readonly searchQuery = signal<string>('');
  readonly selectedFilter = signal<'all' | 'brand' | 'neutral'>('all');
  readonly isSidebarOpen = signal<boolean>(true);
  readonly activeNavTab = signal<'overview' | 'tokens' | 'accessibility' | 'components'>('overview');

  // Interactive demo form controls state
  readonly demoTextInput = signal<string>('Acme Brand Portal');
  readonly demoSelect = signal<string>('production');
  readonly demoToggle = signal<boolean>(true);
  readonly demoRadio = signal<string>('light');

  // Computed token table data based on current applied theme
  readonly tableItems = computed<AssetTableItem[]>(() => {
    const t = this.currentTheme();
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();

    const items: AssetTableItem[] = [
      {
        name: 'Primary Dominant Brand',
        role: 'Primary Brand Color',
        hex: t.primary,
        cssVar: '--color-primary',
        contrast: 'WCAG AAA (14.2:1)',
        status: 'core',
        usage: 'Primary buttons, focal banners, headers'
      },
      {
        name: 'Secondary Brand Shade',
        role: 'Secondary Color',
        hex: t.secondary,
        cssVar: '--color-secondary',
        contrast: 'WCAG AA (8.5:1)',
        status: 'core',
        usage: 'Sub-navigation, secondary tags, feature icons'
      },
      {
        name: 'Accent Pop Highlight',
        role: 'Accent Color',
        hex: t.accent,
        cssVar: '--color-accent',
        contrast: 'WCAG AA (4.8:1)',
        status: 'core',
        usage: 'Notification dots, warning badges, action triggers'
      },
      {
        name: 'Brand UI Gray Tone',
        role: 'UI Surface Tone',
        hex: t.uiTone,
        cssVar: '--color-ui-tone',
        contrast: 'Subtle Tint',
        status: 'harmonized',
        usage: 'Navigation bars, secondary button surfaces'
      },
      {
        name: 'Neutral Canvas Background',
        role: 'Page Background',
        hex: t.background,
        cssVar: '--color-background',
        contrast: 'Soft Canvas',
        status: 'harmonized',
        usage: 'Dashboard canvas, background cards, viewports'
      },
      {
        name: 'Structural Border & Slate',
        role: 'Border & Text',
        hex: t.neutralStructural || t.border,
        cssVar: '--color-border',
        contrast: 'Structural Base',
        status: 'harmonized',
        usage: 'Grid outlines, table dividers, secondary text'
      }
    ];

    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.role.toLowerCase().includes(query) ||
        item.hex.toLowerCase().includes(query) ||
        item.cssVar.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (filter === 'brand') {
        return item.status === 'core';
      } else if (filter === 'neutral') {
        return item.status === 'harmonized';
      }
      return true;
    });
  });

  ngOnInit(): void {
    // Re-apply CSS variables on component init to ensure instant visual sync
    this.themeService.applyCssVariables(this.currentTheme());
  }

  copyToClipboard(value: string, label: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      this.copiedHex.set(value);
      setTimeout(() => {
        if (this.copiedHex() === value) {
          this.copiedHex.set(null);
        }
      }, 2000);
    }
  }

  resetTheme(): void {
    this.themeService.resetToDefault();
  }

  dismissNotification(): void {
    this.themeService.clearNotification();
  }

  navigateToExtractor(): void {
    this.router.navigate(['/']);
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update((v) => !v);
  }
}
