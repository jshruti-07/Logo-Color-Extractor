import { SamplePreset } from '../models/color.model';

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'prism-flow',
    name: 'Prism AI Tech',
    description: 'Vibrant multi-hue modern gradient logo with electric violet, coral, and cyan',
    category: 'Technology',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
      <defs>
        <linearGradient id="p1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366F1" />
          <stop offset="100%" stop-color="#EC4899" />
        </linearGradient>
        <linearGradient id="p2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#06B6D4" />
          <stop offset="100%" stop-color="#3B82F6" />
        </linearGradient>
        <linearGradient id="p3" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#F59E0B" />
          <stop offset="100%" stop-color="#EF4444" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" rx="60" fill="#0F172A" />
      <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2"/>
      <path d="M140 100 L260 100 L320 200 L260 300 L140 300 L80 200 Z" fill="url(#p1)" opacity="0.9" />
      <polygon points="200,120 280,200 200,280 120,200" fill="url(#p2)" opacity="0.95" />
      <circle cx="200" cy="200" r="45" fill="url(#p3)" />
      <circle cx="200" cy="200" r="18" fill="#FFFFFF" />
    </svg>`
  },
  {
    id: 'eco-leaf',
    name: 'Verdant BioLabs',
    description: 'Organic sustainability brand with emerald mint, forest green, and lime zest',
    category: 'Sustainability',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
        <linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#84CC16" />
          <stop offset="100%" stop-color="#10B981" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" rx="60" fill="#064E3B" />
      <path d="M200,80 C260,80 320,130 320,210 C320,290 250,330 200,330 C150,330 80,290 80,210 C80,130 140,80 200,80 Z" fill="url(#g1)" />
      <path d="M200,120 C240,120 280,160 280,215 C280,270 235,295 200,295 C165,295 120,270 120,215 C120,160 160,120 200,120 Z" fill="url(#g2)" />
      <path d="M200,140 Q215,220 200,280" stroke="#ECFDF5" stroke-width="12" stroke-linecap="round" fill="none"/>
      <circle cx="200" cy="100" r="16" fill="#FACC15" />
    </svg>`
  },
  {
    id: 'cyber-pulse',
    name: 'Hyperion Cybernetics',
    description: 'High-contrast futuristic brand with neon cyan, deep cobalt, and amber flame',
    category: 'Fintech / Security',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
      <rect width="400" height="400" rx="60" fill="#030712" />
      <polygon points="200,60 330,140 330,280 200,350 70,280 70,140" fill="none" stroke="#06B6D4" stroke-width="8" />
      <polygon points="200,100 290,160 290,255 200,305 110,255 110,160" fill="#1E293B" stroke="#3B82F6" stroke-width="6" />
      <circle cx="200" cy="205" r="50" fill="#F97316" />
      <polygon points="200,175 225,220 175,220" fill="#FFFFFF" />
    </svg>`
  },
  {
    id: 'sunset-crest',
    name: 'Solaris Creative Studio',
    description: 'Warm gradient sunrise with golden amber, crimson red, and magenta violet',
    category: 'Creative Studio',
    svgData: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
      <defs>
        <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FDE047" />
          <stop offset="50%" stop-color="#F97316" />
          <stop offset="100%" stop-color="#BE185D" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" rx="60" fill="#18181B" />
      <circle cx="200" cy="200" r="120" fill="url(#sunGrad)" />
      <path d="M100,240 Q200,160 300,240 L300,320 L100,320 Z" fill="#09090B" opacity="0.85" />
      <path d="M130,270 Q200,210 270,270 L270,320 L130,320 Z" fill="#18181B" />
    </svg>`
  }
];
