import { describe, it, expect } from 'vitest';
import {
  brand,
  commonLabels,
  pageTitle,
  content,
  navigation,
  auth,
  errors,
  dashboard,
  repository,
  ui,
  partners,
  themePage,
  apiDocs,
} from './index';

describe('brand', () => {
  it('should have appName defined', () => {
    expect(brand.appName).toBe('Talent Finder');
  });

  it('should have all organization names defined', () => {
    expect(brand.ecrin).toBeDefined();
    expect(brand.eunicoast).toBeDefined();
    expect(brand.ulhn).toBeDefined();
    expect(brand.cptmp).toBeDefined();
  });

  it('should have external service names defined', () => {
    expect(brand.github).toBe('GitHub');
    expect(brand.zenodo).toBe('Zenodo');
    expect(brand.appwrite).toBe('Appwrite');
    expect(brand.openAlex).toBe('OpenAlex');
  });
});

describe('commonLabels', () => {
  it('should have color labels defined', () => {
    expect(commonLabels.primary).toBeDefined();
    expect(commonLabels.accent).toBeDefined();
    expect(commonLabels.secondary).toBeDefined();
    expect(commonLabels.success).toBeDefined();
    expect(commonLabels.warning).toBeDefined();
    expect(commonLabels.error).toBeDefined();
  });

  it('should have font labels defined', () => {
    expect(commonLabels.heading).toBeDefined();
    expect(commonLabels.body).toBeDefined();
    expect(commonLabels.mono).toBeDefined();
  });

  it('should have status labels defined', () => {
    expect(commonLabels.statusLabels).toBeDefined();
    expect(commonLabels.statusLabels.healthy).toBeDefined();
    expect(commonLabels.statusLabels.degraded).toBeDefined();
    expect(commonLabels.statusLabels.unhealthy).toBeDefined();
  });
});

describe('pageTitle', () => {
  it('should build page title with brand suffix', () => {
    const result = pageTitle('Dashboard');
    expect(result).toContain('Dashboard');
    expect(result).toContain(brand.titleSuffix);
  });
});

describe('content (home)', () => {
  it('should have hero section defined', () => {
    expect(content.hero).toBeDefined();
    expect(content.hero.title).toBeDefined();
    expect(content.hero.subtitle).toBeDefined();
    expect(content.hero.ctaLoggedIn).toBeDefined();
    expect(content.hero.ctaLoggedOut).toBeDefined();
  });

  it('should have howItWorks section with steps', () => {
    expect(content.howItWorks).toBeDefined();
    expect(content.howItWorks.steps).toBeInstanceOf(Array);
    expect(content.howItWorks.steps.length).toBeGreaterThan(0);
  });

  it('should have challenges section with items', () => {
    expect(content.challenges).toBeDefined();
    expect(content.challenges.items).toBeInstanceOf(Array);
    expect(content.challenges.items.length).toBeGreaterThan(0);
  });

  it('should have cta section defined', () => {
    expect(content.cta).toBeDefined();
    expect(content.cta.title).toBeDefined();
    expect(content.cta.buttonLoggedIn).toBeDefined();
    expect(content.cta.buttonLoggedOut).toBeDefined();
  });
});

describe('navigation', () => {
  it('should have links defined', () => {
    expect(navigation.links).toBeDefined();
    expect(navigation.links.home).toBeDefined();
    expect(navigation.links.dashboard).toBeDefined();
  });

  it('should have actions defined', () => {
    expect(navigation.actions).toBeDefined();
    expect(navigation.actions.signIn).toBeDefined();
    expect(navigation.actions.signOut).toBeDefined();
  });

  it('should have footer section defined', () => {
    expect(navigation.footer).toBeDefined();
    expect(navigation.footer.attribution).toBeDefined();
  });
});

describe('auth', () => {
  it('should have login section defined', () => {
    expect(auth.login).toBeDefined();
    expect(auth.login.title).toBeDefined();
  });

  it('should have form section defined', () => {
    expect(auth.form).toBeDefined();
    expect(auth.form.emailLabel).toBeDefined();
    expect(auth.form.submitButton).toBeDefined();
  });

  it('should have modal section defined', () => {
    expect(auth.modal).toBeDefined();
    expect(auth.modal.title).toBeDefined();
  });
});

describe('errors', () => {
  it('should have notFound section defined', () => {
    expect(errors.notFound).toBeDefined();
    expect(errors.notFound.title).toBeDefined();
    expect(errors.notFound.message).toBeDefined();
  });

  it('should have generic section defined', () => {
    expect(errors.generic).toBeDefined();
    expect(errors.generic.title).toBeDefined();
  });

  it('should have buttons defined', () => {
    expect(errors.buttons).toBeDefined();
    expect(errors.buttons.backToHome).toBeDefined();
  });
});

describe('dashboard', () => {
  it('should have meta section defined', () => {
    expect(dashboard.meta).toBeDefined();
    expect(dashboard.meta.title).toBeDefined();
  });

  it('should have header section defined', () => {
    expect(dashboard.header).toBeDefined();
    expect(dashboard.header.title).toBeDefined();
  });

  it('should have cards defined', () => {
    expect(dashboard.cards).toBeDefined();
    expect(dashboard.cards.repository).toBeDefined();
    expect(dashboard.cards.apiDocs).toBeDefined();
  });
});

describe('repository', () => {
  it('should have meta section defined', () => {
    expect(repository.meta).toBeDefined();
    expect(repository.meta.title).toBeDefined();
  });

  it('should have columns defined', () => {
    expect(repository.columns).toBeDefined();
    expect(repository.columns.period).toBeDefined();
    expect(repository.columns.commits).toBeDefined();
  });

  it('should have labels defined', () => {
    expect(repository.labels).toBeDefined();
    expect(repository.labels.additions).toBeDefined();
    expect(repository.labels.deletions).toBeDefined();
  });
});

describe('ui', () => {
  it('should have common section defined', () => {
    expect(ui.common).toBeDefined();
    expect(ui.common.tryAgain).toBeDefined();
  });

  it('should have health section defined', () => {
    expect(ui.health).toBeDefined();
    expect(ui.health.status).toBeDefined();
    expect(ui.health.status.healthy).toBeDefined();
  });

  it('should have connectivity section defined', () => {
    expect(ui.connectivity).toBeDefined();
    expect(ui.connectivity.noInternet).toBeDefined();
  });

  it('should use commonLabels.statusLabels for health status', () => {
    expect(ui.health.status).toBe(commonLabels.statusLabels);
  });

  it('should have researchOrganization section defined', () => {
    expect(ui.researchOrganization).toBeDefined();
    expect(ui.researchOrganization.title).toBeDefined();
    expect(ui.researchOrganization.searchPlaceholder).toBeDefined();
    expect(ui.researchOrganization.selectedTitle).toBeDefined();
  });

  it('should have researchOutput section defined', () => {
    expect(ui.researchOutput).toBeDefined();
    expect(ui.researchOutput.title).toBeDefined();
    expect(ui.researchOutput.articlesByYear).toBeDefined();
    expect(ui.researchOutput.affiliatedAuthors).toBeDefined();
  });
});

describe('partners', () => {
  it('should have header section defined', () => {
    expect(partners.header).toBeDefined();
    expect(partners.header.title).toBeDefined();
  });

  it('should have partner sections defined', () => {
    expect(partners.ulhn).toBeDefined();
    expect(partners.cptmp).toBeDefined();
    expect(partners.eunicoast).toBeDefined();
  });
});

describe('themePage', () => {
  it('should have meta section defined', () => {
    expect(themePage.meta).toBeDefined();
    expect(themePage.meta.title).toBeDefined();
  });

  it('should have selectorBar section defined', () => {
    expect(themePage.selectorBar).toBeDefined();
    expect(themePage.selectorBar.fontLabels).toBeDefined();
  });

  it('should use commonLabels for font labels', () => {
    expect(themePage.selectorBar.fontLabels.heading).toBe(commonLabels.heading);
    expect(themePage.selectorBar.fontLabels.body).toBe(commonLabels.body);
    expect(themePage.selectorBar.fontLabels.mono).toBe(commonLabels.mono);
  });

  it('should have colorScales section defined', () => {
    expect(themePage.colorScales).toBeDefined();
    expect(themePage.colorScales.colorNames).toBeDefined();
  });
});

describe('apiDocs', () => {
  it('should have meta section defined', () => {
    expect(apiDocs.meta).toBeDefined();
    expect(apiDocs.meta.title).toBeDefined();
  });
});

/**
 * Tests for i18n Context API.
 * Note: Full context tests require Svelte component rendering.
 * These tests verify the static exports and type consistency.
 */
describe('i18n context exports', () => {
  it('should export setI18nContext function', async () => {
    const { setI18nContext } = await import('./index');
    expect(typeof setI18nContext).toBe('function');
  });

  it('should export useI18n function', async () => {
    const { useI18n } = await import('./index');
    expect(typeof useI18n).toBe('function');
  });

  it('should export hasI18nContext function', async () => {
    const { hasI18nContext } = await import('./index');
    expect(typeof hasI18nContext).toBe('function');
  });

  it('should export all i18n context functions', async () => {
    const mod = await import('./index');
    expect(mod).toHaveProperty('setI18nContext');
    expect(mod).toHaveProperty('useI18n');
    expect(mod).toHaveProperty('hasI18nContext');
  });
});

describe('i18n context module', () => {
  it('should have all expected exports from i18n-context.svelte', async () => {
    const context = await import('./core/i18n-context.svelte');
    expect(context).toHaveProperty('setI18nContext');
    expect(context).toHaveProperty('useI18n');
    expect(context).toHaveProperty('hasI18nContext');
  });
});
