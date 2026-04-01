/**
 * Theme content - English.
 * Content for theme customization page and theme preferences card.
 */

import { brand, commonLabels, pageTitle } from '$lib/content/locales/en/brand';
import type { ThemeContent } from '$lib/content/types';

/**
 * English theme content.
 */
export const en: ThemeContent = {
  card: {
    title: 'Theme preferences',
    palette: 'Palette',
    font: 'Font',
    mode: 'Mode',
    light: 'Light',
    dark: 'Dark',
    changeTheme: 'Change theme',
  },
  page: {
    meta: {
      title: pageTitle('Theme'),
      description: `Theme customization and design system for ${brand.ecrin} ${brand.appName}`,
    },
    selectorBar: {
      title: 'Theme customization',
      fontLabels: {
        heading: commonLabels.heading,
        body: commonLabels.body,
        mono: commonLabels.mono,
      },
      resetButton: 'Reset',
      resetFeedback: 'Random!',
      setButton: 'Set',
      setFeedback: 'Set!',
    },
    hero: {
      title: 'Theme customization',
      description:
        'Customize colors and fonts to preview your application appearance. Select a palette and font pairing to see changes applied.',
    },
    currentSettings: {
      title: 'Current settings',
      paletteTitle: 'Palette',
      fontTitle: 'Fonts',
      fontLabels: {
        heading: commonLabels.heading,
        body: commonLabels.body,
        mono: commonLabels.mono,
      },
      fontDemo: {
        headingText: 'The quick brown fox jumps',
        bodyText:
          'The quick brown fox jumps over the lazy dog. This text demonstrates the body font.',
        monoText: 'const example = "code";',
      },
      colorLabels: {
        primary: commonLabels.primary,
        accent: commonLabels.accent,
        neutral: 'Neutral',
        success: commonLabels.success,
        warning: commonLabels.warning,
        error: commonLabels.error,
      },
    },
    colorScales: {
      title: 'Color scales',
      scaleHeader: 'Scale',
      colorNames: {
        primary: commonLabels.primary,
        accent: commonLabels.accent,
        secondary: commonLabels.secondary,
        success: commonLabels.success,
        warning: commonLabels.warning,
        error: commonLabels.error,
      },
      usageExamples: {
        title: 'Usage examples',
        background: '// Background',
        textColor: '// Text color',
        border: '// Border',
        cssVariable: '// CSS variable',
      },
    },
    buttons: {
      title: 'Buttons',
      variantsTitle: 'Variants',
      withIconsTitle: 'With icons',
      variants: {
        primary: commonLabels.primary,
        secondary: commonLabels.secondary,
        accent: commonLabels.accent,
        outline: 'Outline',
        ghost: 'Ghost',
      },
      iconButtons: {
        addItem: 'Add',
        download: 'Download',
        settings: 'Settings',
      },
    },
    alerts: {
      title: 'Alerts',
      labels: {
        info: `${commonLabels.info}:`,
        success: `${commonLabels.success}:`,
        warning: `${commonLabels.warning}:`,
        error: `${commonLabels.error}:`,
      },
      info: 'This is an informational message using theme colors.',
      success: 'Operation completed successfully!',
      warning: 'Please verify before continuing.',
      error: 'An error occurred. Please try again.',
    },
    modalSection: {
      title: 'Modal and Signup',
      modalCard: {
        title: 'Modal',
        description: 'Click the button to open a modal dialog.',
        openButton: 'Open modal',
      },
      signupCard: {
        title: 'Signup',
        description: 'The signup component is a modal form for user authentication.',
        openButton: 'Open signup modal',
      },
      modalContent: {
        title: 'Modal example',
        line1:
          'This is a reusable modal component. It handles backdrop click, escape key, and focus management.',
        line2: 'You can pass any content as children and optionally provide a footer snippet.',
        footer: 'Press Escape or click outside to close.',
      },
    },
    statCards: {
      title: 'Stat cards',
      labels: {
        default: 'Default',
        success: commonLabels.success,
        danger: 'Danger',
        net: commonLabels.net,
      },
    },
    badges: {
      title: 'Badges',
      labels: {
        primary: commonLabels.primary,
        accent: commonLabels.accent,
        success: commonLabels.success,
        warning: commonLabels.warning,
        error: commonLabels.error,
      },
    },
    cardSection: {
      title: 'Card',
      card1: {
        title: 'Card component',
        description: 'This is a reusable Card component with default shadow styling.',
        button: 'Action',
      },
      card2: {
        title: 'Card with custom class',
        description: 'Cards accept a prop for customization.',
        button: 'Custom action',
      },
    },
    loadingSpinner: {
      title: 'Loading spinner',
      sizeVariants: 'Size variants',
      colorVariants: 'Color variants',
      sizes: {
        small: 'Small',
        medium: 'Medium',
        large: 'Large',
      },
      colors: {
        primary: commonLabels.primary,
        accent: commonLabels.accent,
        secondary: commonLabels.secondary,
      },
    },
    themeToggle: {
      title: 'Theme toggle',
      description:
        'The theme toggle component allows users to switch between light and dark mode. The selection is persisted in cookies.',
      hint: 'Click to toggle between light and dark mode',
    },
  },
};
