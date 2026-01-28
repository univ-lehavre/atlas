<script setup lang="ts">
import { computed, ref } from 'vue';

interface CodeStats {
  files: number;
  functions: number;
  types: number;
  interfaces: number;
  constants: number;
}

interface TestStats {
  files: number;
  describes: number;
  tests: number;
}

interface PackageStats {
  name: string;
  path: string;
  code: CodeStats;
  tests: TestStats;
  latestCommit: string | null;
  commitCount: number;
  linesAdded: number;
  linesDeleted: number;
}

const props = defineProps<{
  packages: PackageStats[];
}>();

type SortKey = 'name' | 'commits' | 'files' | 'functions' | 'tests';
type SortDirection = 'asc' | 'desc';

const sortKey = ref<SortKey>('commits');
const sortDirection = ref<SortDirection>('desc');

const sortedPackages = computed(() => {
  const sorted = [...props.packages];

  sorted.sort((a, b) => {
    let valueA: number | string;
    let valueB: number | string;

    switch (sortKey.value) {
      case 'name':
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case 'commits':
        valueA = a.commitCount;
        valueB = b.commitCount;
        break;
      case 'files':
        valueA = a.code.files;
        valueB = b.code.files;
        break;
      case 'functions':
        valueA = a.code.functions;
        valueB = b.code.functions;
        break;
      case 'tests':
        valueA = a.tests.tests;
        valueB = b.tests.tests;
        break;
      default:
        valueA = a.commitCount;
        valueB = b.commitCount;
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDirection.value === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }

    return sortDirection.value === 'asc'
      ? (valueA as number) - (valueB as number)
      : (valueB as number) - (valueA as number);
  });

  return sorted;
});

const toggleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDirection.value = 'desc';
  }
};

const getSortIcon = (key: SortKey) => {
  if (sortKey.value !== key) return '↕';
  return sortDirection.value === 'asc' ? '↑' : '↓';
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
</script>

<template>
  <div class="package-table-container">
    <table class="package-table">
      <thead>
        <tr>
          <th class="sortable" @click="toggleSort('name')">
            Package <span class="sort-icon">{{ getSortIcon('name') }}</span>
          </th>
          <th class="sortable numeric" @click="toggleSort('commits')">
            Commits <span class="sort-icon">{{ getSortIcon('commits') }}</span>
          </th>
          <th class="sortable numeric" @click="toggleSort('files')">
            Fichiers <span class="sort-icon">{{ getSortIcon('files') }}</span>
          </th>
          <th class="sortable numeric" @click="toggleSort('functions')">
            Fonctions <span class="sort-icon">{{ getSortIcon('functions') }}</span>
          </th>
          <th class="sortable numeric" @click="toggleSort('tests')">
            Tests <span class="sort-icon">{{ getSortIcon('tests') }}</span>
          </th>
          <th class="numeric">Dernier commit</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pkg in sortedPackages" :key="pkg.name">
          <td class="package-name">
            <code>{{ pkg.name }}</code>
          </td>
          <td class="numeric">{{ pkg.commitCount }}</td>
          <td class="numeric">{{ pkg.code.files }}</td>
          <td class="numeric">{{ pkg.code.functions }}</td>
          <td class="numeric">{{ pkg.tests.tests }}</td>
          <td class="numeric date">{{ formatDate(pkg.latestCommit) }}</td>
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

.package-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.package-table th.sortable:hover {
  background-color: var(--vp-c-bg-mute);
}

.sort-icon {
  margin-left: 0.25rem;
  opacity: 0.6;
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

.date {
  white-space: nowrap;
  color: var(--vp-c-text-2);
}

.package-table tbody tr:hover {
  background-color: var(--vp-c-bg-soft);
}
</style>
