/**
 * Type definitions for centralized content.
 * These types ensure type safety for all text content in the application.
 */

/**
 * Accessibility labels for UI components.
 */
export interface AccessibilityContent {
  /** Modal close button */
  closeModal: string;
  /** Alert close button */
  closeAlert: string;
  /** Menu toggle button */
  toggleMenu: string;
  /** Close menu/drawer button */
  closeMenu: string;
  /** Breadcrumb navigation */
  breadcrumbs: string;
  /** Language selector */
  languageSelector: string;
  /** Change language */
  changeLanguage: string;
}

/**
 * Language selector content.
 */
export interface LanguageSelectorContent {
  /** Current language label */
  currentLanguage: string;
  /** Select language label */
  selectLanguage: string;
}

/**
 * Navigation content structure.
 */
export interface NavigationContent {
  /** Navigation links */
  links: {
    home: string;
    dashboard: string;
  };
  /** External link descriptions */
  external: {
    github: string;
    githubDescription: string;
  };
  /** User actions */
  actions: {
    signIn: string;
    signOut: string;
  };
  /** Brand name */
  brand: string;
  /** Footer content */
  footer: {
    attribution: string;
  };
}

/**
 * Authentication content structure.
 */
export interface AuthContent {
  /** Login page content */
  login: {
    title: string;
    description: string;
    loading: {
      title: string;
      message: string;
    };
    error: {
      title: string;
      message: string;
    };
    buttons: {
      retry: string;
      home: string;
    };
  };
  /** Login form content */
  form: {
    title: string;
    description: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailHint: string;
    submitButton: string;
    submitting: string;
    error: {
      prefix: string;
      default: string;
    };
    success: {
      title: string;
      message: string;
    };
    footer: string;
    termsLink: string;
  };
  /** Signup modal content */
  modal: {
    title: string;
    closeLabel: string;
    description: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailHint: string;
    submitButton: string;
    submitting: string;
    error: {
      prefix: string;
      default: string;
    };
    closeAlert: string;
    success: string;
    footer: string;
  };
  /** Server error codes translations */
  errorCodes: {
    /** Invalid email format or not allowed domain */
    invalid_email: string;
    /** Invalid magic link parameters */
    magicurl_login_validation_error: string;
    /** Generic signup failure */
    signup_failed: string;
    /** Generic login failure */
    login_failed: string;
    /** Invalid or expired magic link */
    invalid_magic_link: string;
    /** Unexpected server error */
    unexpected_error: string;
  };
}

/**
 * Error page content structure.
 */
export interface ErrorContent {
  /** Page title suffix */
  titleSuffix: string;
  /** 404 error */
  notFound: {
    title: string;
    message: string;
  };
  /** Generic error */
  generic: {
    title: string;
    message: string;
  };
  /** Action buttons */
  buttons: {
    backToHome: string;
    goBack: string;
  };
}

/**
 * Dashboard content structure.
 */
export interface DashboardContent {
  /** Page metadata */
  meta: {
    title: string;
    description: string;
  };
  /** Page header */
  header: {
    title: string;
    welcomeBack: string;
  };
  /** External links */
  externalLinks: {
    ecrin: {
      title: string;
      description: string;
    };
    github: {
      title: string;
      description: string;
    };
    zenodo: {
      title: string;
      description: string;
    };
  };
  /** Coming soon section */
  comingSoon: {
    title: string;
    description: string;
    features: string[];
  };
  /** Admin cards */
  cards: {
    repository: {
      title: string;
      description: string;
      linkText: string;
    };
    apiDocs: {
      title: string;
      description: string;
      linkText: string;
    };
  };
}

/**
 * Common shared content structure.
 */
export interface CommonContent {
  /** Common labels */
  labels: {
    tryAgain: string;
    checkStatus: string;
    email: string;
    notLoggedIn: string;
    customize: string;
    updated: string;
  };
  /** Relative time labels */
  relativeTime: {
    justNow: string;
    secondsAgo: string;
    minutesAgo: string;
    hoursAgo: string;
    yesterday: string;
    daysAgo: string;
  };
  /** Coming soon section */
  comingSoon: {
    defaultTitle: string;
    defaultDescription: string;
  };
}

/**
 * Health status content structure.
 */
export interface HealthContent {
  /** Health card */
  card: {
    title: string;
    refreshLabel: string;
    status: {
      healthy: string;
      degraded: string;
      unhealthy: string;
    };
    services: {
      appwrite: string;
      internet: string;
    };
    checked: string;
    apiKey: string;
    valid: string;
    invalid: string;
    notFound: string;
    missing: string;
  };
  /** Connectivity banner */
  connectivity: {
    appwriteUnavailable: {
      title: string;
      description: string;
    };
    noInternet: {
      title: string;
      description: string;
    };
  };
}

/**
 * Profile content structure.
 */
export interface ProfileContent {
  /** Profile card */
  card: {
    title: string;
    complete: string;
    incomplete: string;
  };
  /** Consent card */
  consent: {
    title: string;
    openAlexTitle: string;
    grantedMessage: string;
    declinedMessage: string;
    pendingMessage: string;
    grantButton: string;
    revokeButton: string;
    declineButton: string;
  };
}

/**
 * Research content structure.
 */
export interface ResearchContent {
  /** Research organization search */
  organization: {
    title: string;
    consentRequired: string;
    consentMessage: string;
    searchPlaceholder: string;
    maxReached: string;
    noResults: string;
    selectedTitle: string;
    maxLabel: string;
    noSelection: string;
    works: string;
    citations: string;
    removeLabel: string;
  };
  /** Research output card */
  output: {
    title: string;
    consentMessage: string;
    selectOrganizations: string;
    loading: string;
    articlesByYear: string;
    before: string;
    affiliatedAuthors: string;
    total: string;
  };
}

/**
 * Theme content structure (card + page).
 */
export interface ThemeContent {
  /** Theme preferences card */
  card: {
    title: string;
    palette: string;
    font: string;
    mode: string;
    light: string;
    dark: string;
    changeTheme: string;
  };
  /** Theme page content */
  page: ThemePageContent;
}

/**
 * Repository page content structure.
 */
export interface RepositoryContent {
  /** Page metadata */
  meta: {
    title: string;
  };
  /** Page header */
  header: {
    title: string;
  };
  /** Table columns */
  columns: {
    period: string;
    commits: string;
    additions: string;
    deletions: string;
    authors: string;
  };
  /** Section titles */
  sections: {
    githubLinks: string;
    history: string;
    recentActivity: string;
    sourceCode: string;
    tests: string;
    githubIssues: string;
    githubPRs: string;
  };
  /** Labels */
  labels: {
    repository: string;
    issues: string;
    newIssue: string;
    pullRequests: string;
    discussions: string;
    open: string;
    commits: string;
    additions: string;
    deletions: string;
    net: string;
    firstCommit: string;
    lastCommit: string;
    files: string;
    exportedConstants: string;
    exportedFunctions: string;
    exportedTypes: string;
    testFiles: string;
    describeBlocks: string;
    testCases: string;
    opened: string;
    closed: string;
    periods: string;
    activityCaption: string;
  };
}

/**
 * UI component content structure.
 */
export interface UIContent {
  /** Common labels */
  common: {
    tryAgain: string;
    checkStatus: string;
    email: string;
    notLoggedIn: string;
    customize: string;
    updated: string;
  };
  /** Relative time labels */
  relativeTime: {
    justNow: string;
    secondsAgo: string;
    minutesAgo: string;
    hoursAgo: string;
    yesterday: string;
    daysAgo: string;
  };
  /** Connectivity banner */
  connectivity: {
    appwriteUnavailable: {
      title: string;
      description: string;
    };
    noInternet: {
      title: string;
      description: string;
    };
  };
  /** Consent card */
  consent: {
    title: string;
    openAlexTitle: string;
    grantedMessage: string;
    declinedMessage: string;
    pendingMessage: string;
    grantButton: string;
    revokeButton: string;
    declineButton: string;
  };
  /** Profile card */
  profile: {
    title: string;
    complete: string;
    incomplete: string;
  };
  /** Theme preferences card */
  theme: {
    title: string;
    palette: string;
    font: string;
    mode: string;
    light: string;
    dark: string;
    changeTheme: string;
  };
  /** Coming soon section */
  comingSoon: {
    defaultTitle: string;
    defaultDescription: string;
  };
  /** Health status card */
  health: {
    title: string;
    refreshLabel: string;
    status: {
      healthy: string;
      degraded: string;
      unhealthy: string;
    };
    services: {
      appwrite: string;
      internet: string;
    };
    checked: string;
    apiKey: string;
    valid: string;
    invalid: string;
    notFound: string;
    missing: string;
  };
  /** Research organization search */
  researchOrganization: {
    title: string;
    consentRequired: string;
    consentMessage: string;
    searchPlaceholder: string;
    maxReached: string;
    noResults: string;
    selectedTitle: string;
    maxLabel: string;
    noSelection: string;
    works: string;
    citations: string;
    removeLabel: string;
  };
  /** Research output card */
  researchOutput: {
    title: string;
    consentMessage: string;
    selectOrganizations: string;
    loading: string;
    articlesByYear: string;
    before: string;
    affiliatedAuthors: string;
    total: string;
  };
}

/**
 * Theme page content structure.
 */
export interface ThemePageContent {
  /** Page metadata */
  meta: {
    title: string;
    description: string;
  };
  /** Theme selector bar */
  selectorBar: {
    title: string;
    fontLabels: {
      heading: string;
      body: string;
      mono: string;
    };
    resetButton: string;
    resetFeedback: string;
    setButton: string;
    setFeedback: string;
  };
  /** Hero section */
  hero: {
    title: string;
    description: string;
  };
  /** Current settings section */
  currentSettings: {
    title: string;
    paletteTitle: string;
    fontTitle: string;
    fontLabels: {
      heading: string;
      body: string;
      mono: string;
    };
    fontDemo: {
      headingText: string;
      bodyText: string;
      monoText: string;
    };
    colorLabels: {
      primary: string;
      accent: string;
      neutral: string;
      success: string;
      warning: string;
      error: string;
    };
  };
  /** Color scales section */
  colorScales: {
    title: string;
    scaleHeader: string;
    colorNames: {
      primary: string;
      accent: string;
      secondary: string;
      success: string;
      warning: string;
      error: string;
    };
    usageExamples: {
      title: string;
      background: string;
      textColor: string;
      border: string;
      cssVariable: string;
    };
  };
  /** Buttons section */
  buttons: {
    title: string;
    variantsTitle: string;
    withIconsTitle: string;
    variants: {
      primary: string;
      secondary: string;
      accent: string;
      outline: string;
      ghost: string;
    };
    iconButtons: {
      addItem: string;
      download: string;
      settings: string;
    };
  };
  /** Alerts section */
  alerts: {
    title: string;
    labels: {
      info: string;
      success: string;
      warning: string;
      error: string;
    };
    info: string;
    success: string;
    warning: string;
    error: string;
  };
  /** Modal section */
  modalSection: {
    title: string;
    modalCard: {
      title: string;
      description: string;
      openButton: string;
    };
    signupCard: {
      title: string;
      description: string;
      openButton: string;
    };
    modalContent: {
      title: string;
      line1: string;
      line2: string;
      footer: string;
    };
  };
  /** Stat cards section */
  statCards: {
    title: string;
    labels: {
      default: string;
      success: string;
      danger: string;
      net: string;
    };
  };
  /** Badges section */
  badges: {
    title: string;
    labels: {
      primary: string;
      accent: string;
      success: string;
      warning: string;
      error: string;
    };
  };
  /** Card section */
  cardSection: {
    title: string;
    card1: {
      title: string;
      description: string;
      button: string;
    };
    card2: {
      title: string;
      description: string;
      button: string;
    };
  };
  /** Loading spinner section */
  loadingSpinner: {
    title: string;
    sizeVariants: string;
    colorVariants: string;
    sizes: {
      small: string;
      medium: string;
      large: string;
    };
    colors: {
      primary: string;
      accent: string;
      secondary: string;
    };
  };
  /** Theme toggle section */
  themeToggle: {
    title: string;
    description: string;
    hint: string;
  };
}

/**
 * API documentation page content structure.
 */
export interface ApiDocsContent {
  /** Page metadata */
  meta: {
    title: string;
  };
}

/**
 * Partners section content structure.
 */
export interface PartnersContent {
  /** Section header */
  header: {
    title: string;
    subtitle: string;
  };
  /** Footer partner logos alt texts */
  footer: {
    cptmpAlt: string;
    ulhnAlt: string;
    eunicoastAlt: string;
  };
  /** ULHN partner */
  ulhn: {
    title: string;
    description: string;
  };
  /** CPTMP partner */
  cptmp: {
    title: string;
    description: string;
    features: {
      smartCity: {
        title: string;
        description: string;
      };
      maritime: {
        title: string;
        description: string;
      };
      energy: {
        title: string;
        description: string;
      };
    };
  };
  /** EUNICoast partner */
  eunicoast: {
    title: string;
    description: string;
    tags: string[];
  };
}

/**
 * Challenge item for homepage.
 */
export interface Challenge {
  /** Challenge title */
  title: string;
  /** Problem description */
  problem: string;
  /** Solution description */
  solution: string;
}

/**
 * Step item for homepage how-it-works section.
 */
export interface Step {
  /** Step number */
  number: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
}

/**
 * Homepage content structure.
 */
export interface HomeContent {
  /** Page metadata */
  meta: {
    title: string;
    description: string;
  };
  /** Hero section */
  hero: {
    title: string;
    subtitle: string;
    ctaLoggedIn: string;
    ctaLoggedOut: string;
    learnMore: string;
  };
  /** How it works section */
  howItWorks: {
    title: string;
    subtitle: string;
    steps: Step[];
  };
  /** Challenges section */
  challenges: {
    title: string;
    subtitle: string;
    items: Challenge[];
  };
  /** Call to action section */
  cta: {
    title: string;
    subtitle: string;
    buttonLoggedIn: string;
    buttonLoggedOut: string;
  };
}
