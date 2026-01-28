<script setup lang="ts">
import { computed, ref } from 'vue';
import { data as repoStats } from '../../data/repo-stats.data';
import TimelineChart from './charts/TimelineChart.vue';
import PackageTable from './PackageTable.vue';

type TimelineMode = 'daily' | 'monthly';

const timelineMode = ref<TimelineMode>('monthly');

const timelineData = computed(() => {
  if (timelineMode.value === 'daily') {
    // Limit to last 90 days for daily view
    return repoStats.timeline.daily.slice(-90);
  }
  return repoStats.timeline.monthly;
});

const formatNumber = (n: number) => {
  return n.toLocaleString('fr-FR');
};

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
    <h2>Dynamique du dépôt</h2>

    <p class="description">
      Statistiques du dépôt Atlas, générées automatiquement à partir de l'historique Git.
    </p>

    <!-- Summary cards -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(repoStats.repository.totalCommits) }}</div>
        <div class="stat-label">Commits</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(repoStats.current.code.files) }}</div>
        <div class="stat-label">Fichiers source</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(repoStats.current.code.functions) }}</div>
        <div class="stat-label">Fonctions</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(repoStats.current.code.types + repoStats.current.code.interfaces) }}</div>
        <div class="stat-label">Types / Interfaces</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(repoStats.current.tests.tests) }}</div>
        <div class="stat-label">Tests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(repoStats.packages.length) }}</div>
        <div class="stat-label">Packages</div>
      </div>
    </div>

    <!-- Timeline chart -->
    <div class="section">
      <div class="section-header">
        <h3>Évolution temporelle</h3>
        <div class="timeline-toggle">
          <button
            :class="{ active: timelineMode === 'monthly' }"
            @click="timelineMode = 'monthly'"
          >
            Mensuel
          </button>
          <button
            :class="{ active: timelineMode === 'daily' }"
            @click="timelineMode = 'daily'"
          >
            Journalier (90j)
          </button>
        </div>
      </div>
      <TimelineChart :data="timelineData" />
    </div>

    <!-- Package table -->
    <div class="section">
      <h3>Activité par package</h3>
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
  padding: 1.5rem;
  background-color: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.repo-dynamics h2 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  border-bottom: none;
}

.description {
  color: var(--vp-c-text-2);
  margin-bottom: 1.5rem;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: var(--vp-c-bg);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--vp-c-divider);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin-top: 0.25rem;
}

.section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.section h3 {
  margin: 0;
  border-bottom: none;
}

.timeline-toggle {
  display: flex;
  gap: 0.5rem;
}

.timeline-toggle button {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.timeline-toggle button:hover {
  border-color: var(--vp-c-brand-1);
}

.timeline-toggle button.active {
  background-color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: white;
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
</style>
