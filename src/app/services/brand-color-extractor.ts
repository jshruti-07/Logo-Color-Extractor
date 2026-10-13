/**
 * Brand Color Extractor Service
 * Pure TypeScript module with no DOM or Angular dependencies.
 * Extracts true brand colors using CIELAB color space, background/edge filtering,
 * leader clustering, satellite merging, and hue-diverse ranking.
 */

export interface ExtractOptions {
  removeBackground?: boolean; // default true
  mergeDeltaE?: number; // default 14
  minShare?: number; // default 0.005 (0.5%)
  accentMinShare?: number; // default 0.0015 (0.15%)
  neutralChroma?: number; // default 12
}

export interface ExtractedBrandColor {
  r: number;
  g: number;
  b: number;
  count: number;
  isNeutral: boolean;
}

export interface ExtractionResult {
  colors: ExtractedBrandColor[];
  visiblePixels: number;
  analyzedPixels: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
  chroma: number;
}

/**
 * Converts standard sRGB [0-255] to CIELAB (D65 illuminant, 2° observer)
 */
export function rgbToLab(r: number, g: number, b: number): LabColor {
  const rL = r / 255;
  const gL = g / 255;
  const bL = b / 255;

  const rLin = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  const gLin = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  const bLin = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  // D65 Standard Reference White: Xn = 0.95047, Yn = 1.00000, Zn = 1.08883
  const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) / 0.95047;
  const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.072175) / 1.0;
  const z = (rLin * 0.0193339 + gLin * 0.119192 + bLin * 0.9503041) / 1.08883;

  const fX = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  const fY = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  const fZ = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;

  const L = 116 * fY - 16;
  const aVal = 500 * (fX - fY);
  const bVal = 200 * (fY - fZ);
  const chroma = Math.sqrt(aVal * aVal + bVal * bVal);

  return { L, a: aVal, b: bVal, chroma };
}

/**
 * Computes CIE76 color difference Delta E between two Lab colors
 */
export function deltaE76(lab1: LabColor, lab2: LabColor): number {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

interface InternalCluster {
  r: number;
  g: number;
  b: number;
  count: number;
  lab: LabColor;
  isNeutral: boolean;
  score: number;
}

/**
 * Extracts true brand colors from raw pixel data.
 */
export function extractBrandColors(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options?: ExtractOptions
): ExtractionResult {
  const removeBackground = options?.removeBackground ?? true;
  const mergeDeltaE = options?.mergeDeltaE ?? 14;
  const minShare = options?.minShare ?? 0.005;
  const accentMinShare = options?.accentMinShare ?? 0.0015;
  const neutralChroma = options?.neutralChroma ?? 12;

  const totalPixels = width * height;
  let visiblePixels = 0;

  // Track valid foreground pixels
  const isForeground = new Uint8Array(totalPixels);
  const labCache = new Array<LabColor | null>(totalPixels);

  // a. Alpha filtering
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = data[idx + 3];

    if (a >= 125) {
      visiblePixels++;
      // Pixels with alpha >= 250 are solid foreground candidates
      if (a >= 250) {
        isForeground[i] = 1;
        labCache[i] = rgbToLab(data[idx], data[idx + 1], data[idx + 2]);
      }
    }
  }

  if (visiblePixels === 0) {
    return { colors: [], visiblePixels: 0, analyzedPixels: 0 };
  }

  // b. Background removal
  if (removeBackground) {
    const borderIndices: number[] = [];

    // Top and bottom rows
    for (let x = 0; x < width; x++) {
      borderIndices.push(x); // Top
      borderIndices.push((height - 1) * width + x); // Bottom
    }
    // Left and right columns (excluding corners already added)
    for (let y = 1; y < height - 1; y++) {
      borderIndices.push(y * width); // Left
      borderIndices.push(y * width + (width - 1)); // Right
    }

    interface BorderCluster {
      r: number;
      g: number;
      b: number;
      lab: LabColor;
      count: number;
    }

    const borderClusters: BorderCluster[] = [];
    let validBorderCount = 0;

    for (const bIdx of borderIndices) {
      if (isForeground[bIdx] === 1) {
        validBorderCount++;
        const pLab = labCache[bIdx]!;
        const r = data[bIdx * 4];
        const g = data[bIdx * 4 + 1];
        const b = data[bIdx * 4 + 2];

        let matched = false;
        for (const bc of borderClusters) {
          if (deltaE76(pLab, bc.lab) < 8) {
            bc.count++;
            matched = true;
            break;
          }
        }

        if (!matched) {
          borderClusters.push({ r, g, b, lab: pLab, count: 1 });
        }
      }
    }

    if (validBorderCount > 0 && borderClusters.length > 0) {
      borderClusters.sort((a, b) => b.count - a.count);
      const topBorder = borderClusters[0];

      // If one colour covers > 60% of the border pixels AND is neutral (chroma < 15)
      if (topBorder.count / validBorderCount > 0.6 && topBorder.lab.chroma < 15) {
        const bgLab = topBorder.lab;
        for (let i = 0; i < totalPixels; i++) {
          if (isForeground[i] === 1) {
            if (deltaE76(labCache[i]!, bgLab) < 12) {
              isForeground[i] = 0; // Remove background pixel
            }
          }
        }
      }
    }
  }

  // Count foreground pixels after background removal
  let foregroundCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (isForeground[i] === 1) {
      foregroundCount++;
    }
  }

  if (foregroundCount === 0) {
    // If all pixels were removed by background removal, fall back to non-background removed solid pixels
    for (let i = 0; i < totalPixels; i++) {
      if (data[i * 4 + 3] >= 250) {
        isForeground[i] = 1;
        if (!labCache[i]) {
          labCache[i] = rgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
        }
        foregroundCount++;
      }
    }
  }

  // c. Edge removal
  const isEdge = new Uint8Array(totalPixels);
  let nonEdgeCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (isForeground[idx] === 1) {
        const currentLab = labCache[idx]!;
        let edge = false;

        // Compare with right neighbour
        if (x + 1 < width) {
          const rightIdx = y * width + (x + 1);
          if (data[rightIdx * 4 + 3] >= 125) {
            const rightLab = labCache[rightIdx] || rgbToLab(data[rightIdx * 4], data[rightIdx * 4 + 1], data[rightIdx * 4 + 2]);
            if (deltaE76(currentLab, rightLab) > 10) {
              edge = true;
            }
          }
        }

        // Compare with bottom neighbour
        if (!edge && y + 1 < height) {
          const bottomIdx = (y + 1) * width + x;
          if (data[bottomIdx * 4 + 3] >= 125) {
            const bottomLab = labCache[bottomIdx] || rgbToLab(data[bottomIdx * 4], data[bottomIdx * 4 + 1], data[bottomIdx * 4 + 2]);
            if (deltaE76(currentLab, bottomLab) > 10) {
              edge = true;
            }
          }
        }

        if (edge) {
          isEdge[idx] = 1;
        } else {
          nonEdgeCount++;
        }
      }
    }
  }

  // Fallback if too few pixels remain after edge removal
  const minRequiredPixels = Math.max(30, Math.floor(0.03 * foregroundCount));
  const useAllForeground = nonEdgeCount < minRequiredPixels;

  // d. Histogram & Leader Clustering in CIELAB
  const colorHistogram = new Map<number, number>();
  for (let i = 0; i < totalPixels; i++) {
    if (isForeground[i] === 1 && (useAllForeground || isEdge[i] === 0)) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const key = (r << 16) | (g << 8) | b;
      colorHistogram.set(key, (colorHistogram.get(key) || 0) + 1);
    }
  }

  if (colorHistogram.size === 0) {
    return { colors: [], visiblePixels, analyzedPixels: 0 };
  }

  // Sort histogram entries by frequency descending
  const sortedEntries = Array.from(colorHistogram.entries()).sort((a, b) => b[1] - a[1]);

  let analyzedPixels = 0;
  const clusters: InternalCluster[] = [];

  for (const [key, count] of sortedEntries) {
    analyzedPixels += count;
    const r = (key >> 16) & 255;
    const g = (key >> 8) & 255;
    const b = key & 255;
    const lab = rgbToLab(r, g, b);

    let nearestCluster: InternalCluster | null = null;
    let minD = Infinity;

    for (const cl of clusters) {
      const d = deltaE76(lab, cl.lab);
      if (d < minD) {
        minD = d;
        nearestCluster = cl;
      }
    }

    if (nearestCluster && minD < mergeDeltaE) {
      // Merge into existing cluster (leader remains the most frequent colour)
      nearestCluster.count += count;
    } else {
      // Start new cluster with this exact RGB as leader
      clusters.push({
        r,
        g,
        b,
        count,
        lab,
        isNeutral: lab.chroma < neutralChroma,
        score: 0
      });
    }
  }

  // e. Satellite merge
  // Absorb a small cluster into nearest larger cluster if ΔE < 22 and count < 35% of that cluster
  let activeClusters = [...clusters];
  let mergedAny = true;

  while (mergedAny) {
    mergedAny = false;
    activeClusters.sort((a, b) => b.count - a.count);

    for (let i = activeClusters.length - 1; i >= 0; i--) {
      const candidate = activeClusters[i];
      let bestTarget: InternalCluster | null = null;
      let minD = Infinity;

      for (let j = 0; j < activeClusters.length; j++) {
        if (i === j) continue;
        const target = activeClusters[j];
        if (target.count > candidate.count) {
          const d = deltaE76(candidate.lab, target.lab);
          if (d < minD) {
            minD = d;
            bestTarget = target;
          }
        }
      }

      if (bestTarget && minD < 22 && candidate.count < 0.35 * bestTarget.count) {
        bestTarget.count += candidate.count;
        activeClusters.splice(i, 1);
        mergedAny = true;
        break;
      }
    }
  }

  // f. Filtering
  activeClusters.sort((a, b) => b.count - a.count);
  const survivingClusters: InternalCluster[] = [];

  for (let i = 0; i < activeClusters.length; i++) {
    const cl = activeClusters[i];
    const share = cl.count / analyzedPixels;

    if (share >= minShare) {
      survivingClusters.push(cl);
    } else if (share >= accentMinShare && cl.lab.chroma >= 35) {
      // Rescue smaller vibrant accent if it is at least ΔE 35 from every larger cluster
      const isDistinctFromLarger = activeClusters
        .slice(0, i)
        .every((larger) => deltaE76(cl.lab, larger.lab) >= 35);

      if (isDistinctFromLarger) {
        survivingClusters.push(cl);
      }
    }
  }

  // g. Classification & Scoring
  for (const cl of survivingClusters) {
    cl.isNeutral = cl.lab.chroma < neutralChroma;
    const share = cl.count / analyzedPixels;
    let weight = 1.0;
    if (cl.isNeutral) {
      weight = cl.lab.L > 90 ? 0.1 : 0.35;
    }
    cl.score = share * weight;
  }

  // h. Ranking with Hue-Diverse Pass
  survivingClusters.sort((a, b) => b.score - a.score);

  const picked: InternalCluster[] = [];
  const remaining: InternalCluster[] = [];

  for (const cl of survivingClusters) {
    const isDiverse = picked.every((p) => deltaE76(cl.lab, p.lab) >= 25);
    if (isDiverse) {
      picked.push(cl);
    } else {
      remaining.push(cl);
    }
  }

  const rankedClusters = [...picked, ...remaining];

  return {
    colors: rankedClusters.map((c) => ({
      r: c.r,
      g: c.g,
      b: c.b,
      count: c.count,
      isNeutral: c.isNeutral
    })),
    visiblePixels,
    analyzedPixels
  };
}

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  gray: '#808080',
  grey: '#808080',
  silver: '#C0C0C0',
  gold: '#FFD700',
  navy: '#000080',
  teal: '#008080',
  maroon: '#800000',
  lime: '#00FF00',
  aqua: '#00FFFF',
  fuchsia: '#FF00FF',
  olive: '#808000'
};

function normalizeColorString(str: string): string | null {
  if (!str) return null;
  const val = str.trim().toLowerCase();
  if (
    val === 'none' ||
    val === 'transparent' ||
    val === 'currentcolor' ||
    val === 'inherit' ||
    val.startsWith('url(')
  ) {
    return null;
  }

  if (val.startsWith('#')) {
    const hex = val.replace('#', '');
    if (hex.length === 3) {
      return (
        '#' +
        hex
          .split('')
          .map((c) => c + c)
          .join('')
          .toUpperCase()
      );
    }
    if (hex.length === 6) {
      return '#' + hex.toUpperCase();
    }
    return null;
  }

  if (val.startsWith('rgb')) {
    const match = val.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (match) {
      const r = Math.max(0, Math.min(255, Math.round(parseFloat(match[1]))));
      const g = Math.max(0, Math.min(255, Math.round(parseFloat(match[2]))));
      const b = Math.max(0, Math.min(255, Math.round(parseFloat(match[3]))));
      const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
      if (a < 0.1) return null;
      return (
        '#' +
        [r, g, b]
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()
      );
    }
    return null;
  }

  if (NAMED_COLORS[val]) {
    return NAMED_COLORS[val];
  }

  return null;
}

/**
 * Extracts distinct fill, stroke, stop-color, and flood-color values from SVG text.
 */
export function parseSvgColors(svgText: string): string[] {
  if (!svgText) return [];

  const foundHexes = new Set<string>();

  // 1. Direct attribute matching: fill="...", stroke="...", stop-color="...", flood-color="..."
  const attrRegex = /\b(fill|stroke|stop-color|flood-color|color)\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(svgText)) !== null) {
    const hex = normalizeColorString(match[2]);
    if (hex) foundHexes.add(hex);
  }

  // 2. Style attribute and <style> block property matching: fill: ...; stroke: ...; stop-color: ...;
  const stylePropRegex = /(?:^|[;{\s])(fill|stroke|stop-color|flood-color|color)\s*:\s*([^;!}]+)/gi;
  while ((match = stylePropRegex.exec(svgText)) !== null) {
    const hex = normalizeColorString(match[2]);
    if (hex) foundHexes.add(hex);
  }

  return Array.from(foundHexes);
}

/**
 * Snaps extracted raster colours to the nearest exact SVG colours if within ΔE threshold.
 */
export function snapToExactColors(
  colors: ExtractedBrandColor[],
  exactHexes: string[],
  maxDeltaE = 12
): ExtractedBrandColor[] {
  if (!exactHexes.length || !colors.length) return colors;

  const exactLabs = exactHexes
    .map((hex) => {
      const clean = hex.replace('#', '');
      if (clean.length !== 6) return null;
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return { hex, r, g, b, lab: rgbToLab(r, g, b) };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!exactLabs.length) return colors;

  for (const c of colors) {
    const cLab = rgbToLab(c.r, c.g, c.b);
    let bestMatch: (typeof exactLabs)[0] | null = null;
    let minD = Infinity;

    for (const ex of exactLabs) {
      const d = deltaE76(cLab, ex.lab);
      if (d < minD) {
        minD = d;
        bestMatch = ex;
      }
    }

    if (bestMatch && minD <= maxDeltaE) {
      c.r = bestMatch.r;
      c.g = bestMatch.g;
      c.b = bestMatch.b;
      c.isNeutral = bestMatch.lab.chroma < 12;
    }
  }

  return colors;
}
