/**
 * Generate VitePress sidebar from TypeDoc API documentation structure.
 *
 * This script scans the docs/api/@univ-lehavre/ directory and generates
 * a JSON sidebar configuration with expandable sub-menus for each package.
 *
 * @module
 */

import { readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const API_DIR = join(ROOT_DIR, 'docs/api/@univ-lehavre');
const OUTPUT_FILE = join(ROOT_DIR, 'docs/.vitepress/data/api-sidebar.json');

interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
}

// Package categories matching the current sidebar structure
const PACKAGE_GROUPS: Record<string, string[]> = {
  Applications: ['atlas-ecrin', 'atlas-find-an-expert', 'atlas-amarre'],
  REDCap: ['atlas-crf', 'atlas-redcap-core', 'atlas-redcap-openapi', 'atlas-redcap-sandbox'],
  Utilitaires: ['atlas-net', 'atlas-errors', 'atlas-validators', 'atlas-shared-config', 'atlas-logos'],
  Appwrite: ['atlas-appwrite', 'atlas-auth'],
};

// TypeDoc standard category folders
const TYPEDOC_CATEGORIES = ['functions', 'classes', 'interfaces', 'type-aliases', 'variables', 'namespaces'];

// Human-readable labels for categories
const CATEGORY_LABELS: Record<string, string> = {
  functions: 'Functions',
  classes: 'Classes',
  interfaces: 'Interfaces',
  'type-aliases': 'Types',
  variables: 'Variables',
  namespaces: 'Namespaces',
};

/**
 * Check if a directory exists and is not empty.
 */
function isValidDirectory(path: string): boolean {
  if (!existsSync(path)) return false;
  const stat = statSync(path);
  if (!stat.isDirectory()) return false;
  const contents = readdirSync(path);
  return contents.length > 0;
}

/**
 * Get markdown files in a directory (excluding index.md).
 */
function getMarkdownFiles(dirPath: string): string[] {
  if (!isValidDirectory(dirPath)) return [];

  return readdirSync(dirPath)
    .filter((file) => file.endsWith('.md') && file !== 'index.md')
    .map((file) => file.replace('.md', ''))
    .sort();
}

/**
 * Get subdirectories in a directory.
 */
function getSubdirectories(dirPath: string): string[] {
  if (!isValidDirectory(dirPath)) return [];

  return readdirSync(dirPath)
    .filter((item) => {
      const itemPath = join(dirPath, item);
      return statSync(itemPath).isDirectory();
    })
    .sort();
}

/**
 * Build sidebar items for a TypeDoc category (functions, classes, etc.).
 */
function buildCategoryItems(packagePath: string, category: string, baseLinkPath: string): SidebarItem | null {
  const categoryPath = join(packagePath, category);
  const files = getMarkdownFiles(categoryPath);

  if (files.length === 0) return null;

  return {
    text: CATEGORY_LABELS[category] || category,
    collapsed: true,
    items: files.map((file) => ({
      text: file,
      link: `${baseLinkPath}/${category}/${file}`,
    })),
  };
}

/**
 * Build sidebar items for a module (sub-package like crf/redcap in atlas-crf).
 */
function buildModuleItems(packagePath: string, moduleName: string, baseLinkPath: string): SidebarItem | null {
  const modulePath = join(packagePath, moduleName);
  if (!isValidDirectory(modulePath)) return null;

  const moduleItems: SidebarItem[] = [];
  const moduleLinkPath = `${baseLinkPath}/${moduleName}`;

  // Add module overview if index.md exists
  if (existsSync(join(modulePath, 'index.md'))) {
    moduleItems.push({
      text: 'Overview',
      link: `${moduleLinkPath}/`,
    });
  }

  // Add TypeDoc categories for this module
  for (const category of TYPEDOC_CATEGORIES) {
    const categoryItem = buildCategoryItems(modulePath, category, moduleLinkPath);
    if (categoryItem) {
      moduleItems.push(categoryItem);
    }
  }

  if (moduleItems.length === 0) return null;

  return {
    text: moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
    collapsed: true,
    items: moduleItems,
  };
}

/**
 * Build sidebar items for a package.
 * Returns null if the package has no API documentation.
 */
function buildPackageItems(packageName: string): SidebarItem | null {
  const packagePath = join(API_DIR, packageName);
  const baseLinkPath = `/api/@univ-lehavre/${packageName}`;

  // Skip packages without API documentation
  if (!isValidDirectory(packagePath)) {
    return null;
  }

  const subdirs = getSubdirectories(packagePath);
  const hasTypedocCategories = subdirs.some((dir) => TYPEDOC_CATEGORIES.includes(dir));
  const hasModules = subdirs.some((dir) => !TYPEDOC_CATEGORIES.includes(dir));

  // Simple package with only index.md (like atlas-logos, atlas-shared-config)
  if (subdirs.length === 0) {
    return {
      text: `@univ-lehavre/${packageName}`,
      link: baseLinkPath + '/',
    };
  }

  const packageItems: SidebarItem[] = [];

  // Add package overview
  packageItems.push({
    text: 'Overview',
    link: baseLinkPath + '/',
  });

  // Add TypeDoc categories at package level
  if (hasTypedocCategories) {
    for (const category of TYPEDOC_CATEGORIES) {
      const categoryItem = buildCategoryItems(packagePath, category, baseLinkPath);
      if (categoryItem) {
        packageItems.push(categoryItem);
      }
    }
  }

  // Add modules (sub-packages) for multi-module packages
  if (hasModules) {
    const modules = subdirs.filter((dir) => !TYPEDOC_CATEGORIES.includes(dir));
    for (const moduleName of modules) {
      const moduleItem = buildModuleItems(packagePath, moduleName, baseLinkPath);
      if (moduleItem) {
        packageItems.push(moduleItem);
      }
    }
  }

  // If only overview, return simple link
  if (packageItems.length === 1) {
    return {
      text: `@univ-lehavre/${packageName}`,
      link: baseLinkPath + '/',
    };
  }

  return {
    text: `@univ-lehavre/${packageName}`,
    collapsed: true,
    items: packageItems,
  };
}

/**
 * Generate the complete API sidebar structure.
 */
function generateApiSidebar(): SidebarItem[] {
  const sidebar: SidebarItem[] = [
    {
      text: 'Reference',
      items: [{ text: "Vue d'ensemble", link: '/api/' }],
    },
  ];

  for (const [groupName, packages] of Object.entries(PACKAGE_GROUPS)) {
    const groupItems: SidebarItem[] = [];

    for (const packageName of packages) {
      const packageItem = buildPackageItems(packageName);
      if (packageItem) {
        groupItems.push(packageItem);
      }
    }

    // Only add group if it has packages with documentation
    if (groupItems.length > 0) {
      sidebar.push({
        text: groupName,
        collapsed: false,
        items: groupItems,
      });
    }
  }

  return sidebar;
}

// Main execution
console.log('📚 Generating API sidebar...');
console.log(`   Source: ${API_DIR}`);
console.log(`   Output: ${OUTPUT_FILE}`);

const sidebar = generateApiSidebar();

// Count items
let totalPackages = 0;
let totalItems = 0;

const countItems = (items: SidebarItem[]): void => {
  for (const item of items) {
    if (item.link?.startsWith('/api/@univ-lehavre/') && item.link.endsWith('/')) {
      totalPackages++;
    }
    if (item.link) {
      totalItems++;
    }
    if (item.items) {
      countItems(item.items);
    }
  }
};

countItems(sidebar);

writeFileSync(OUTPUT_FILE, JSON.stringify(sidebar, null, 2));

console.log('');
console.log('✅ API sidebar generated successfully!');
console.log(`   Packages: ${totalPackages}`);
console.log(`   Total items: ${totalItems}`);
