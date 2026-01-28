import { describe, it, expect } from 'vitest';
import { brand, commonLabels, pageTitle } from './brand';

describe('brand', () => {
  it('should export app name', () => {
    expect(brand.appName).toBe('Talent Finder');
  });

  it('should export full app name', () => {
    expect(brand.appNameFull).toBe('ECRIN | Talent finder');
  });

  it('should export title suffix', () => {
    expect(brand.titleSuffix).toBe('- ECRIN | Talent finder');
  });

  it('should export project and organization names', () => {
    expect(brand.ecrin).toBe('ECRIN');
    expect(brand.ulhn).toBe('Université Le Havre Normandie');
    expect(brand.eunicoast).toBe('EUNICoast');
  });

  it('should export external service names', () => {
    expect(brand.github).toBe('GitHub');
    expect(brand.openAlex).toBe('OpenAlex');
    expect(brand.zenodo).toBe('Zenodo');
    expect(brand.appwrite).toBe('Appwrite');
  });
});

describe('commonLabels', () => {
  it('should export color/variant labels in French', () => {
    expect(commonLabels.primary).toBe('Primaire');
    expect(commonLabels.secondary).toBe('Secondaire');
    expect(commonLabels.success).toBe('Succès');
    expect(commonLabels.error).toBe('Erreur');
  });

  it('should export common action labels in French', () => {
    expect(commonLabels.retry).toBe('Réessayer');
    expect(commonLabels.home).toBe('Accueil');
  });

  it('should export health status labels in French', () => {
    expect(commonLabels.statusLabels.healthy).toBe('Opérationnel');
    expect(commonLabels.statusLabels.degraded).toBe('Dégradé');
    expect(commonLabels.statusLabels.unhealthy).toBe('Hors service');
  });
});

describe('pageTitle', () => {
  it('should create page title with brand suffix', () => {
    const result = pageTitle('Dashboard');
    expect(result).toBe('Dashboard - ECRIN | Talent finder');
  });

  it('should handle empty page name', () => {
    const result = pageTitle('');
    expect(result).toBe(' - ECRIN | Talent finder');
  });

  it('should handle special characters', () => {
    const result = pageTitle('Mon profil | Paramètres');
    expect(result).toBe('Mon profil | Paramètres - ECRIN | Talent finder');
  });
});
