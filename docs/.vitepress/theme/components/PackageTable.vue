<script setup lang="ts">
interface CodeStats {
  files: number;
  functions: number;
  types: number;
  interfaces: number;
  constants: number;
  tsdocComments: number;
}

interface TestStats {
  files: number;
  describes: number;
  tests: number;
}

interface PackageStats {
  name: string;
  path: string;
  version: string | null;
  code: CodeStats;
  tests: TestStats;
  latestCommit: string | null;
  commitCount: number;
  prCount: number;
  releaseCount: number;
  linesAdded: number;
  linesDeleted: number;
}

defineProps<{
  packages: PackageStats[];
}>();

const formatRelativeDate = (dateString: string | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Il y a ${months} mois`;
  }
  const years = Math.floor(diffDays / 365);
  return `Il y a ${years} an${years > 1 ? 's' : ''}`;
};
</script>

<template>
  <div class="package-table-container">
    <table class="package-table">
      <thead>
        <tr>
          <th>Package</th>
          <th>Version</th>
          <th class="numeric vertical">
            <span class="vertical-label">Releases</span>
          </th>
          <th class="numeric vertical">
            <span class="vertical-label">PRs</span>
          </th>
          <th class="numeric vertical">
            <span class="vertical-label">Commits</span>
          </th>
          <th class="numeric vertical">
            <span class="vertical-label">Fichiers</span>
          </th>
          <th class="numeric vertical">
            <span class="vertical-label">Lignes</span>
          </th>
          <th class="numeric vertical">
            <span class="vertical-label">Types</span>
          </th>
          <th class="numeric vertical">
            <span class="vertical-label">Fonctions</span>
          </th>
          <th class="numeric vertical">
            <span class="vertical-label">TSDoc</span>
          </th>
          <th class="numeric vertical">
            <span class="vertical-label">Tests</span>
          </th>
          <th class="numeric">Dernier commit</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pkg in packages" :key="pkg.name">
          <td class="package-name">
            <code>{{ pkg.name.replace('@univ-lehavre/atlas-', '') }}</code>
          </td>
          <td class="version">
            <code v-if="pkg.version">{{ pkg.version }}</code>
            <span v-else>-</span>
          </td>
          <td class="numeric">{{ pkg.releaseCount }}</td>
          <td class="numeric">{{ pkg.prCount }}</td>
          <td class="numeric">{{ pkg.commitCount }}</td>
          <td class="numeric">{{ pkg.code.files }}</td>
          <td class="numeric">{{ pkg.linesAdded + pkg.linesDeleted }}</td>
          <td class="numeric">{{ pkg.code.types + pkg.code.interfaces }}</td>
          <td class="numeric">{{ pkg.code.functions }}</td>
          <td class="numeric">{{ pkg.code.tsdocComments }}</td>
          <td class="numeric">{{ pkg.tests.tests }}</td>
          <td class="numeric date">{{ formatRelativeDate(pkg.latestCommit) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.package-table-container {
  overflow-x: auto;
  margin: 1rem 0;
}

.package-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.package-table th,
.package-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.package-table th {
  background-color: var(--vp-c-bg-soft);
  font-weight: 600;
  white-space: nowrap;
}

.package-table th.vertical {
  height: 100px;
  vertical-align: bottom;
  padding: 0.5rem 0.25rem;
  text-align: center;
}

.vertical-label {
  display: block;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  white-space: nowrap;
  font-size: 0.8rem;
}

.numeric {
  text-align: right;
}

.package-name code {
  font-size: 0.85rem;
  padding: 0.15rem 0.4rem;
  background-color: var(--vp-c-bg-soft);
  border-radius: 4px;
}

.version code {
  font-size: 0.8rem;
  padding: 0.1rem 0.35rem;
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 4px;
}

.date {
  white-space: nowrap;
  color: var(--vp-c-text-2);
}

.package-table tbody tr:hover {
  background-color: var(--vp-c-bg-soft);
}
</style>
