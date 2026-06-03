<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface TimelineEntry {
  period: string;
  commits: number;
  additions: number;
  deletions: number;
  filesChanged: number;
}

export type MetricType = 'commits' | 'filesChanged' | 'additions' | 'deletions';

const metricConfig: Record<MetricType, { label: string; color: string }> = {
  commits: { label: 'Commits', color: 'rgb(59, 130, 246)' },
  filesChanged: { label: 'Fichiers modifiés', color: 'rgb(16, 185, 129)' },
  additions: { label: 'Lignes ajoutées', color: 'rgb(34, 197, 94)' },
  deletions: { label: 'Lignes supprimées', color: 'rgb(239, 68, 68)' },
};

const props = defineProps<{
  data: TimelineEntry[];
  title?: string;
  metrics?: MetricType[];
}>();

const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;
});

const activeMetrics = computed(() => props.metrics?.length ? props.metrics : ['commits'] as MetricType[]);

const chartData = computed(() => {
  const labels = props.data.map((d) => d.period);

  const datasets = activeMetrics.value.map((metric) => {
    const config = metricConfig[metric];
    return {
      label: config.label,
      data: props.data.map((d) => d[metric]),
      borderColor: config.color,
      backgroundColor: config.color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
      fill: false,
      tension: 0.3,
    };
  });

  return { labels, datasets };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: !!props.title,
      text: props.title,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
}));
</script>

<template>
  <div class="timeline-chart" style="height: 300px">
    <Line v-if="isMounted && data.length > 0" :data="chartData" :options="chartOptions" />
    <div v-else-if="data.length === 0" class="no-data">Aucune donnée disponible</div>
  </div>
</template>

<style scoped>
.timeline-chart {
  width: 100%;
  position: relative;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vp-c-text-2);
  font-style: italic;
}
</style>
