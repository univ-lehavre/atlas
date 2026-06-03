<script setup lang="ts">
import { computed } from "vue";
import { data as stats } from "../../data/repo-stats";

// Encart « activité récente » compact. Lit repo-stats (classe C) : total des
// commits suivis et activité du dernier mois de la timeline. Destiné au pied
// de quelques pages transversales (pas toutes, pour ne pas alourdir).

const lastMonth = computed(() => {
  const monthly = stats.timeline.monthly;
  return monthly.length > 0 ? monthly[monthly.length - 1] : null;
});

const available = computed(() => stats.repository.totalCommits > 0);
</script>

<template>
  <div class="kpi-card kpi-inline" v-if="available">
    <span class="kpi-head">Activité</span>
    <span class="kpi-inline-item">
      <strong>{{ stats.repository.totalCommits }}</strong> commits suivis
    </span>
    <span class="kpi-inline-item" v-if="lastMonth">
      <strong>{{ lastMonth.commits }}</strong> sur {{ lastMonth.period }}
    </span>
  </div>
</template>

<style scoped>
@import "./kpi-card.css";

.kpi-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 1rem;
}

.kpi-inline .kpi-head {
  margin-bottom: 0;
}

.kpi-inline-item {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
</style>
