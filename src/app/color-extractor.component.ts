import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ColorHarmony,
  ColorResult,
  ColorScaleItem,
  ImageMeta,
  SamplePreset,
  ThemePaletteToken,
  ToastNotification,
  WebsiteThemePalette
} from './models/color.model';
import { ColorEngine } from './services/color-engine';
import { SAMPLE_PRESETS } from './services/sample-presets';

@Component({
  selector: 'app-color-extractor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-extractor.component.html',
  styleUrl: './color-extractor.component.css'
})
export class ColorExtractorComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('imageCanvas') imageCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewImage') previewImageRef?: ElementRef<HTMLImageElement>;

  // Reactive State Signals
  previewUrl = signal<string | null>(null);
  imageMeta = signal<ImageMeta | null>(null);
  allExtractedColors = signal<ColorResult[]>([]);
  colorCount = signal<number>(0); // 0 = Show All Extracted Colors, 3, 5, 8, 12...
  isDragging = signal(false);
  isAnalyzing = signal(false);
  error = signal<string | null>(null);
  copiedKey = signal<string | null>(null);
  currentTheme = signal<'light' | 'dark'>('light');
  activeTab = signal<'palette' | 'harmonies' | 'export'>('harmonies'); // Default directly to Website Theme Palette for fast viewing
  selectedExportFormat = signal<'css' | 'tailwind' | 'json' | 'scss'>('css');
  
  // Preview Stage Display Customizations
  previewBgMode = signal<'checkerboard' | 'white' | 'dark' | 'slate'>('checkerboard');
  isPreviewModalOpen = signal<boolean>(false);

  // Selected Extracted Color for Harmonies, Shades & Tones
  selectedHarmoniesIndex = signal<number>(0);

  // Selected Source Color for Brand UI Gray Tone (0 = Dominant #1, 1 = Secondary #2, 2 = Accent #3)
  uiToneSourceIndex = signal<number>(0);

  // Interactive Eyedropper / Magnifier state
  isLoupeActive = signal(false);
  loupeX = signal(0);
  loupeY = signal(0);
  hoveredPixelColor = signal<string | null>(null);
  hoveredColorName = signal<string>('');

  // Sample presets
  readonly samplePresets: SamplePreset[] = SAMPLE_PRESETS;
  
  // Toast notifications
  toasts = signal<ToastNotification[]>([]);

  // Computed Values
  colors = computed(() => {
    const count = this.colorCount();
    const all = this.allExtractedColors();
    return count > 0 ? all.slice(0, count) : all;
  });

  dominantColor = computed(() => {
    const list = this.colors();
    return list.length > 0 ? list[0] : null;
  });

  // Website Theme Palette (Top 3 brand shades, 1 Brand UI Gray tone, 2 Theme-Harmonized Neutral Grays)
  websiteThemePalette = computed<WebsiteThemePalette | null>(() => {
    const list = this.colors();
    if (!list.length) return null;
    return ColorEngine.generateWebsiteThemePalette(list, this.uiToneSourceIndex());
  });

  activeHarmoniesColor = computed<ColorResult | null>(() => {
    const list = this.colors();
    if (!list.length) return null;
    const idx = this.selectedHarmoniesIndex();
    return list[idx] || list[0];
  });

  activeHarmonies = computed<ColorHarmony[]>(() => {
    const active = this.activeHarmoniesColor();
    if (!active) return [];
    return ColorEngine.generateHarmonies(active.hex);
  });

  activeDesignScale = computed<ColorScaleItem[]>(() => {
    const active = this.activeHarmoniesColor();
    if (!active) return [];
    return ColorEngine.generateDesignScale(active.hex);
  });

  activeTints = computed<ColorScaleItem[]>(() => {
    const active = this.activeHarmoniesColor();
    if (!active) return [];
    return ColorEngine.generateTints(active.hex);
  });

  activeShades = computed<ColorScaleItem[]>(() => {
    const active = this.activeHarmoniesColor();
    if (!active) return [];
    return ColorEngine.generateShades(active.hex);
  });

  activeTones = computed<ColorScaleItem[]>(() => {
    const active = this.activeHarmoniesColor();
    if (!active) return [];
    return ColorEngine.generateTones(active.hex);
  });

  exportContent = computed(() => {
    return ColorEngine.exportPalette(this.colors(), this.selectedExportFormat(), this.websiteThemePalette());
  });

  private readonly allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  private readonly maxFileSize = 15 * 1024 * 1024; // 15MB
  private currentImageElement: HTMLImageElement | null = null;

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  @HostListener('window:paste', ['$event'])
  handlePaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          this.processFile(file);
          this.showToast('Image pasted from clipboard!', 'info');
          break;
        }
      }
    }
  }

  toggleTheme(): void {
    const nextTheme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
  }

  private setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }

  setPreviewBg(mode: 'checkerboard' | 'white' | 'dark' | 'slate'): void {
    this.previewBgMode.set(mode);
  }

  openPreviewModal(): void {
    this.isPreviewModalOpen.set(true);
  }

  closePreviewModal(): void {
    this.isPreviewModalOpen.set(false);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      await this.processFile(file);
    }
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      await this.processFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    const currentTarget = event.currentTarget as HTMLElement;
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !currentTarget.contains(nextTarget)) {
      this.isDragging.set(false);
    }
  }

  loadPreset(preset: SamplePreset): void {
    const blob = new Blob([preset.svgData], { type: 'image/svg+xml' });
    const file = new File([blob], `${preset.id}-logo.svg`, { type: 'image/svg+xml' });
    this.processFile(file);
    this.showToast(`Loaded preset: ${preset.name}`, 'info');
  }

  private async processFile(file: File): Promise<void> {
    this.error.set(null);
    this.selectedHarmoniesIndex.set(0);
    this.uiToneSourceIndex.set(0);

    if (file.size > this.maxFileSize) {
      const err = 'File is too large. Please upload an image smaller than 15 MB.';
      this.error.set(err);
      this.showToast(err, 'error');
      return;
    }

    if (!this.allowedTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|svg|webp)$/i)) {
      const err = 'Unsupported format. Please upload a PNG, JPG, JPEG, SVG, or WEBP file.';
      this.error.set(err);
      this.showToast(err, 'error');
      return;
    }

    this.allExtractedColors.set([]);
    
    const oldUrl = this.previewUrl();
    if (oldUrl && oldUrl.startsWith('blob:')) {
      URL.revokeObjectURL(oldUrl);
    }

    const url = URL.createObjectURL(file);
    this.previewUrl.set(url);
    this.isAnalyzing.set(true);

    try {
      const img = await this.loadImage(url);
      this.currentImageElement = img;

      const format = file.name.split('.').pop()?.toUpperCase() || 'IMAGE';
      const dimensions = `${img.naturalWidth || 100} × ${img.naturalHeight || 100} px`;

      const { colors, visiblePixels, totalPixels } = this.extractColorsFromImage(img);

      this.imageMeta.set({
        name: file.name,
        size: file.size,
        formattedSize: this.formatFileSize(file.size),
        dimensions,
        width: img.naturalWidth || 100,
        height: img.naturalHeight || 100,
        visiblePixels,
        totalPixels,
        format
      });

      this.allExtractedColors.set(colors);

      if (colors.length === 0) {
        this.error.set('No visible colors detected. The image appears fully transparent.');
        this.showToast('No visible pixels found in image', 'warning');
      } else {
        this.showToast(`Extracted all ${colors.length} unique colors from logo`, 'success');
      }
    } catch (e) {
      console.error(e);
      const err = 'Failed to analyze the image file. Please try another image.';
      this.error.set(err);
      this.showToast(err, 'error');
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  clearImage(): void {
    const oldUrl = this.previewUrl();
    if (oldUrl && oldUrl.startsWith('blob:')) {
      URL.revokeObjectURL(oldUrl);
    }
    this.previewUrl.set(null);
    this.imageMeta.set(null);
    this.allExtractedColors.set([]);
    this.selectedHarmoniesIndex.set(0);
    this.uiToneSourceIndex.set(0);
    this.isAnalyzing.set(false);
    this.error.set(null);
    this.currentImageElement = null;
    this.isLoupeActive.set(false);
    this.isPreviewModalOpen.set(false);
    this.showToast('Workspace cleared', 'info');
  }

  setColorCount(count: number): void {
    this.colorCount.set(count);
    if (count > 0 && this.selectedHarmoniesIndex() >= count) {
      this.selectedHarmoniesIndex.set(0);
    }
  }

  setUiToneSource(index: number): void {
    this.uiToneSourceIndex.set(index);
    const colors = this.colors();
    const color = colors[index];
    const roleLabel = index === 0 ? 'Dominant' : index === 1 ? 'Secondary' : 'Accent';
    if (color) {
      this.showToast(`UI Gray Tone now derived from #${index + 1} ${roleLabel} (${color.name})`, 'info');
    }
  }

  selectHarmoniesColor(index: number): void {
    this.selectedHarmoniesIndex.set(index);
    const color = this.colors()[index];
    if (color) {
      this.showToast(`Selected #${index + 1} ${color.name} (${color.hex})`, 'info');
    }
  }

  onImageMouseMove(event: MouseEvent): void {
    const imgEl = this.previewImageRef?.nativeElement;
    if (!imgEl || !this.currentImageElement) return;

    const imgRect = imgEl.getBoundingClientRect();
    const clientX = event.clientX;
    const clientY = event.clientY;

    const stageTarget = event.currentTarget as HTMLElement;
    const stageRect = stageTarget.getBoundingClientRect();

    this.loupeX.set(clientX - stageRect.left);
    this.loupeY.set(clientY - stageRect.top);

    if (
      clientX < imgRect.left ||
      clientX > imgRect.right ||
      clientY < imgRect.top ||
      clientY > imgRect.bottom
    ) {
      this.hoveredPixelColor.set(null);
      this.hoveredColorName.set('Outside image bounds');
      return;
    }

    this.isLoupeActive.set(true);

    const naturalW = this.currentImageElement.naturalWidth || imgEl.naturalWidth || 1;
    const naturalH = this.currentImageElement.naturalHeight || imgEl.naturalHeight || 1;

    const relX = (clientX - imgRect.left) / imgRect.width;
    const relY = (clientY - imgRect.top) / imgRect.height;

    const pixelX = Math.min(naturalW - 1, Math.max(0, Math.floor(relX * naturalW)));
    const pixelY = Math.min(naturalH - 1, Math.max(0, Math.floor(relY * naturalH)));

    const canvas = document.createElement('canvas');
    canvas.width = naturalW;
    canvas.height = naturalH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(this.currentImageElement, 0, 0, naturalW, naturalH);
    try {
      const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
      if (pixel[3] > 10) {
        const hex = ColorEngine.rgbToHex(pixel[0], pixel[1], pixel[2]);
        this.hoveredPixelColor.set(hex);
        this.hoveredColorName.set(ColorEngine.getColorName(pixel[0], pixel[1], pixel[2]));
      } else {
        this.hoveredPixelColor.set(null);
        this.hoveredColorName.set('Transparent Area');
      }
    } catch {
      //
    }
  }

  onImageMouseLeave(): void {
    this.isLoupeActive.set(false);
  }

  onImageClick(event: MouseEvent): void {
    const color = this.hoveredPixelColor();
    if (color) {
      this.copyValue(color, 'Sampled Color: ' + color);
    }
  }

  async copyValue(value: string, label = 'Copied to clipboard!'): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      this.copiedKey.set(value);
      window.setTimeout(() => {
        if (this.copiedKey() === value) {
          this.copiedKey.set(null);
        }
      }, 1600);

      this.showToast(label, 'success');
    } catch {
      this.showToast('Could not copy to clipboard. Check browser permissions.', 'error');
    }
  }

  showToast(message: string, type: ToastNotification['type'] = 'info'): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastNotification = { id, message, type, timestamp: Date.now() };
    this.toasts.update((current) => [...current, toast]);

    setTimeout(() => {
      this.dismissToast(id);
    }, 3200);
  }

  dismissToast(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  downloadSvgCard(): void {
    const meta = this.imageMeta();
    const colors = this.colors();
    if (!colors.length) return;

    const svgContent = ColorEngine.generateSvgCard(meta?.name || 'logo', colors);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(meta?.name || 'logo').replace(/\.[^/.]+$/, '')}-palette.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast('Downloaded SVG Palette Card!', 'success');
  }

  downloadExportCode(): void {
    const format = this.selectedExportFormat();
    const content = this.exportContent();
    const meta = this.imageMeta();
    const ext = format === 'json' ? 'json' : format === 'tailwind' ? 'js' : format === 'scss' ? 'scss' : 'css';
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(meta?.name || 'logo').replace(/\.[^/.]+$/, '')}-palette.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast(`Downloaded ${format.toUpperCase()} palette file!`, 'success');
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = url;
    });
  }

  private extractColorsFromImage(img: HTMLImageElement): {
    colors: ColorResult[];
    visiblePixels: number;
    totalPixels: number;
  } {
    const naturalW = img.naturalWidth || 160;
    const naturalH = img.naturalHeight || 160;
    
    // Scale for high precision color extraction
    const width = 160;
    const height = Math.max(1, Math.round((naturalH / naturalW) * width));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    const totalPixels = width * height;
    const colorCounts: Record<string, number> = {};
    const blockSize = 6; // Fine-grained quantization bin
    let visiblePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      // Exclude transparent background pixels
      if (a < 125) continue;
      
      visiblePixels++;

      const qr = Math.min(255, Math.round(data[i] / blockSize) * blockSize);
      const qg = Math.min(255, Math.round(data[i + 1] / blockSize) * blockSize);
      const qb = Math.min(255, Math.round(data[i + 2] / blockSize) * blockSize);

      const key = `${qr},${qg},${qb}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    const sortedKeys = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
    const selected: { r: number; g: number; b: number; count: number }[] = [];
    const minColorDistance = 16; // Distinguish distinct subtle brand colors

    for (const key of sortedKeys) {
      const [r, g, b] = key.split(',').map(Number);
      const count = colorCounts[key];

      // Ignore single isolated anti-aliased pixels
      if (count < 2 && visiblePixels > 200) continue;

      const existsClose = selected.some((item) => {
        const dr = item.r - r;
        const dg = item.g - g;
        const db = item.b - b;
        return Math.sqrt(dr * dr + dg * dg + db * db) < minColorDistance;
      });

      if (!existsClose) {
        selected.push({ r, g, b, count });
      } else {
        const closest = selected.find((item) => {
          const dr = item.r - r;
          const dg = item.g - g;
          const db = item.b - b;
          return Math.sqrt(dr * dr + dg * dg + db * db) < minColorDistance;
        });
        if (closest) closest.count += count;
      }
    }

    const results: ColorResult[] = selected.map((item) => {
      return ColorEngine.buildColorResult(item.r, item.g, item.b, item.count, visiblePixels);
    });

    return {
      colors: results,
      visiblePixels,
      totalPixels
    };
  }
}