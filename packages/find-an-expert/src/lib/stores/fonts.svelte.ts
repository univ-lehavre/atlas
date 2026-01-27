/**
 * Font pairing definitions for the theme system
 * Font families are defined in CSS via [data-font="name"] selectors
 * This file provides the list of fonts and their Google Fonts URLs
 */

/** Font category for organizing font pairings */
export type FontCategory = 'sans-serif' | 'serif' | 'display' | 'technical';

/** Font pairing with Google Fonts URL for loading */
export interface FontPairing {
  /** Unique identifier (matches CSS [data-font="name"]) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Category for grouping */
  category: FontCategory;
  /** Heading font family name */
  headingFamily: string;
  /** Body font family name */
  bodyFamily: string;
  /** Monospace font family name */
  monoFamily: string;
  /** Google Fonts URL for loading */
  googleFontsUrl: string;
}

/** Category metadata for display */
interface FontCategoryInfo {
  id: FontCategory;
  name: string;
  description: string;
}

/** Font categories with descriptions */
export const fontCategories: FontCategoryInfo[] = [
  {
    id: 'sans-serif',
    name: 'Sans-serif',
    description: 'Modern, clean fonts without serifs - ideal for interfaces and digital content',
  },
  {
    id: 'serif',
    name: 'Serif',
    description: 'Classic fonts with serifs - excellent for reading and editorial content',
  },
  {
    id: 'display',
    name: 'Display',
    description: 'Decorative and distinctive fonts for headlines and branding',
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Precise and engineered fonts optimized for code and data',
  },
];

/** All available font pairings */
export const fontPairings: FontPairing[] = [
  // === SANS-SERIF ===
  {
    name: 'interface',
    description: 'Clean and modern for web applications',
    category: 'sans-serif',
    headingFamily: 'Inter',
    bodyFamily: 'Inter',
    monoFamily: 'JetBrains Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  },
  {
    name: 'modern',
    description: 'Contemporary and minimal design',
    category: 'sans-serif',
    headingFamily: 'Poppins',
    bodyFamily: 'Open Sans',
    monoFamily: 'Roboto Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap',
  },
  {
    name: 'humanist',
    description: 'Friendly and approachable for content sites',
    category: 'sans-serif',
    headingFamily: 'Nunito',
    bodyFamily: 'Nunito Sans',
    monoFamily: 'Fira Code',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Nunito+Sans:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap',
  },
  {
    name: 'geometric',
    description: 'Clean geometric shapes for modern brands',
    category: 'sans-serif',
    headingFamily: 'Outfit',
    bodyFamily: 'DM Sans',
    monoFamily: 'DM Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap',
  },
  {
    name: 'minimal',
    description: 'Ultra-clean Swiss design aesthetic',
    category: 'sans-serif',
    headingFamily: 'Manrope',
    bodyFamily: 'Karla',
    monoFamily: 'Space Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap',
  },
  {
    name: 'startup',
    description: 'Bold and confident for tech products',
    category: 'sans-serif',
    headingFamily: 'Plus Jakarta Sans',
    bodyFamily: 'Plus Jakarta Sans',
    monoFamily: 'Inconsolata',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  },
  {
    name: 'professional',
    description: 'Corporate and business-oriented',
    category: 'sans-serif',
    headingFamily: 'Lexend',
    bodyFamily: 'Work Sans',
    monoFamily: 'Source Code Pro',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&family=Work+Sans:wght@400;500;600;700&display=swap',
  },
  {
    name: 'friendly',
    description: 'Warm and welcoming personality',
    category: 'sans-serif',
    headingFamily: 'Quicksand',
    bodyFamily: 'Rubik',
    monoFamily: 'Fira Code',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Quicksand:wght@400;500;600;700&family=Rubik:wght@400;500;600;700&display=swap',
  },
  {
    name: 'rounded',
    description: 'Soft and approachable with rounded edges',
    category: 'sans-serif',
    headingFamily: 'Comfortaa',
    bodyFamily: 'Varela Round',
    monoFamily: 'Ubuntu Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Ubuntu+Mono:wght@400;700&family=Varela+Round&display=swap',
  },
  {
    name: 'nordic',
    description: 'Scandinavian minimalist design',
    category: 'sans-serif',
    headingFamily: 'Albert Sans',
    bodyFamily: 'Figtree',
    monoFamily: 'JetBrains Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  },

  // === SERIF ===
  {
    name: 'editorial',
    description: 'Elegant serif for articles and documentation',
    category: 'serif',
    headingFamily: 'Source Serif 4',
    bodyFamily: 'Source Sans 3',
    monoFamily: 'Source Code Pro',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600;700&display=swap',
  },
  {
    name: 'classic',
    description: 'Timeless combination for traditional content',
    category: 'serif',
    headingFamily: 'Playfair Display',
    bodyFamily: 'Lato',
    monoFamily: 'Inconsolata',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;500&family=Lato:wght@400;700&family=Playfair+Display:wght@400;500;600;700&display=swap',
  },
  {
    name: 'literary',
    description: 'Book-like feel for long-form reading',
    category: 'serif',
    headingFamily: 'Merriweather',
    bodyFamily: 'Merriweather',
    monoFamily: 'Fira Code',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Merriweather:wght@400;700&display=swap',
  },
  {
    name: 'magazine',
    description: 'Editorial style for modern publications',
    category: 'serif',
    headingFamily: 'Libre Baskerville',
    bodyFamily: 'Libre Franklin',
    monoFamily: 'Roboto Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Libre+Franklin:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap',
  },
  {
    name: 'academic',
    description: 'Scholarly and refined for research',
    category: 'serif',
    headingFamily: 'Crimson Pro',
    bodyFamily: 'Crimson Pro',
    monoFamily: 'JetBrains Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  },
  {
    name: 'elegant',
    description: 'Sophisticated and luxurious feel',
    category: 'serif',
    headingFamily: 'Cormorant Garamond',
    bodyFamily: 'Proza Libre',
    monoFamily: 'Source Code Pro',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Proza+Libre:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap',
  },
  {
    name: 'news',
    description: 'Traditional newspaper typography',
    category: 'serif',
    headingFamily: 'PT Serif',
    bodyFamily: 'PT Sans',
    monoFamily: 'PT Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=PT+Mono&family=PT+Sans:wght@400;700&family=PT+Serif:wght@400;700&display=swap',
  },
  {
    name: 'typewriter',
    description: 'Nostalgic mechanical typewriter look',
    category: 'serif',
    headingFamily: 'Courier Prime',
    bodyFamily: 'Spectral',
    monoFamily: 'Courier Prime',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Spectral:wght@400;500;600;700&display=swap',
  },
  {
    name: 'transitional',
    description: 'Bridge between old and modern serifs',
    category: 'serif',
    headingFamily: 'Lora',
    bodyFamily: 'Roboto',
    monoFamily: 'Roboto Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&family=Roboto:wght@400;500;700&display=swap',
  },
  {
    name: 'contemporary',
    description: 'Modern serif with clean lines',
    category: 'serif',
    headingFamily: 'Fraunces',
    bodyFamily: 'Commissioner',
    monoFamily: 'Fira Code',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Commissioner:wght@400;500;600;700&family=Fira+Code:wght@400;500&family=Fraunces:wght@400;500;600;700&display=swap',
  },

  // === DISPLAY ===
  {
    name: 'bold-statement',
    description: 'High-impact headlines for marketing',
    category: 'display',
    headingFamily: 'Bebas Neue',
    bodyFamily: 'Montserrat',
    monoFamily: 'Space Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap',
  },
  {
    name: 'creative',
    description: 'Artistic and expressive for portfolios',
    category: 'display',
    headingFamily: 'Abril Fatface',
    bodyFamily: 'Raleway',
    monoFamily: 'Fira Code',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Fira+Code:wght@400;500&family=Raleway:wght@400;500;600;700&display=swap',
  },
  {
    name: 'luxe',
    description: 'Premium and sophisticated branding',
    category: 'display',
    headingFamily: 'Bodoni Moda',
    bodyFamily: 'Josefin Sans',
    monoFamily: 'Inconsolata',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700&family=Inconsolata:wght@400;500&family=Josefin+Sans:wght@400;500;600;700&display=swap',
  },
  {
    name: 'vintage',
    description: 'Retro charm with modern readability',
    category: 'display',
    headingFamily: 'Archivo Black',
    bodyFamily: 'Archivo',
    monoFamily: 'IBM Plex Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
  },
  {
    name: 'urban',
    description: 'Street-smart and contemporary',
    category: 'display',
    headingFamily: 'Oswald',
    bodyFamily: 'Source Sans 3',
    monoFamily: 'Source Code Pro',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&family=Source+Sans+3:wght@400;500;600;700&display=swap',
  },
  {
    name: 'playful',
    description: 'Fun and energetic for young brands',
    category: 'display',
    headingFamily: 'Fredoka',
    bodyFamily: 'Nunito',
    monoFamily: 'Ubuntu Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&family=Ubuntu+Mono:wght@400;700&display=swap',
  },
  {
    name: 'art-deco',
    description: 'Glamorous 1920s inspired style',
    category: 'display',
    headingFamily: 'Poiret One',
    bodyFamily: 'Quicksand',
    monoFamily: 'Space Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Poiret+One&family=Quicksand:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap',
  },
  {
    name: 'condensed',
    description: 'Space-efficient for data-dense UIs',
    category: 'display',
    headingFamily: 'Barlow Condensed',
    bodyFamily: 'Barlow',
    monoFamily: 'Fira Code',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap',
  },
  {
    name: 'contrast',
    description: 'High contrast for dramatic effect',
    category: 'display',
    headingFamily: 'Yeseva One',
    bodyFamily: 'Noto Sans',
    monoFamily: 'Noto Sans Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Noto+Sans+Mono:wght@400;500&family=Noto+Sans:wght@400;500;600;700&family=Yeseva+One&display=swap',
  },
  {
    name: 'slab',
    description: 'Bold slab serif for strong statements',
    category: 'display',
    headingFamily: 'Alfa Slab One',
    bodyFamily: 'Public Sans',
    monoFamily: 'JetBrains Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=JetBrains+Mono:wght@400;500&family=Public+Sans:wght@400;500;600;700&display=swap',
  },

  // === TECHNICAL ===
  {
    name: 'technical',
    description: 'Precise and clear for technical content',
    category: 'technical',
    headingFamily: 'IBM Plex Sans',
    bodyFamily: 'IBM Plex Sans',
    monoFamily: 'IBM Plex Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
  },
  {
    name: 'developer',
    description: 'Optimized for code-heavy documentation',
    category: 'technical',
    headingFamily: 'JetBrains Mono',
    bodyFamily: 'Inter',
    monoFamily: 'JetBrains Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
  },
  {
    name: 'terminal',
    description: 'Command-line inspired aesthetic',
    category: 'technical',
    headingFamily: 'Fira Code',
    bodyFamily: 'Fira Sans',
    monoFamily: 'Fira Code',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@400;500;600;700&display=swap',
  },
  {
    name: 'data',
    description: 'Optimized for tables and numbers',
    category: 'technical',
    headingFamily: 'Roboto',
    bodyFamily: 'Roboto',
    monoFamily: 'Roboto Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap',
  },
  {
    name: 'science',
    description: 'Academic scientific documentation',
    category: 'technical',
    headingFamily: 'STIX Two Text',
    bodyFamily: 'STIX Two Text',
    monoFamily: 'Source Code Pro',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&family=STIX+Two+Text:wght@400;500;600;700&display=swap',
  },
  {
    name: 'engineering',
    description: 'Industrial precision for CAD-like UIs',
    category: 'technical',
    headingFamily: 'Share Tech',
    bodyFamily: 'Exo 2',
    monoFamily: 'Share Tech Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&family=Share+Tech&family=Share+Tech+Mono&display=swap',
  },
  {
    name: 'system',
    description: 'OS-inspired system UI fonts',
    category: 'technical',
    headingFamily: 'Ubuntu',
    bodyFamily: 'Ubuntu',
    monoFamily: 'Ubuntu Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Ubuntu+Mono:wght@400;700&family=Ubuntu:wght@400;500;700&display=swap',
  },
  {
    name: 'console',
    description: 'Retro computing terminal style',
    category: 'technical',
    headingFamily: 'VT323',
    bodyFamily: 'Anonymous Pro',
    monoFamily: 'VT323',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Anonymous+Pro:wght@400;700&family=VT323&display=swap',
  },
  {
    name: 'monospace',
    description: 'Full monospace for coding environments',
    category: 'technical',
    headingFamily: 'Space Mono',
    bodyFamily: 'Space Grotesk',
    monoFamily: 'Space Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap',
  },
  {
    name: 'documentation',
    description: 'Clear technical documentation style',
    category: 'technical',
    headingFamily: 'Atkinson Hyperlegible',
    bodyFamily: 'Atkinson Hyperlegible',
    monoFamily: 'JetBrains Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap',
  },
];

/**
 * Get font pairings filtered by category
 */
export const getFontsByCategory = (category: FontCategory): FontPairing[] => {
  return fontPairings.filter((p) => p.category === category);
};

/**
 * Get a font pairing by name
 */
export const getFontByName = (name: string): FontPairing | undefined => {
  return fontPairings.find((p) => p.name === name);
};
