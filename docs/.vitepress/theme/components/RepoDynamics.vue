<script setup lang="ts">
import { computed } from 'vue';
import { data as repoStats } from '../../data/repo-stats.data';
import PackageTable from './PackageTable.vue';

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const generatedAt = computed(() => {
  if (!repoStats.generatedAt) return '';
  const date = new Date(repoStats.generatedAt);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});
</script>

<template>
  <div class="repo-dynamics">
    <!-- Package table -->
    <div class="section">
      <h2>État des packages <span class="badge">{{ repoStats.packages.length }}</span></h2>
      <PackageTable :packages="repoStats.packages" />
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        Premier commit : <strong>{{ formatDate(repoStats.repository.firstCommit) }}</strong>
        ·
        Dernier commit : <strong>{{ formatDate(repoStats.repository.lastCommit) }}</strong>
      </p>
      <p class="generated-at" v-if="generatedAt">
        Statistiques générées le {{ generatedAt }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.repo-dynamics {
  margin: 2rem 0;
}

.repo-dynamics h2 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  border-bottom: none;
}

.section {
  margin-bottom: 2rem;
}

.section h3 {
  margin: 0;
  border-bottom: none;
}

.footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.footer p {
  margin: 0.25rem 0;
}

.generated-at {
  font-size: 0.8rem;
  font-style: italic;
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 10px;
  margin-left: 0.5rem;
  vertical-align: middle;
}
</style>
