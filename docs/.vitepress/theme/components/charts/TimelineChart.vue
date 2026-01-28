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

const props = defineProps<{
  data: TimelineEntry[];
  title?: string;
}>();

const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;
});

const chartData = computed(() => {
  const labels = props.data.map((d) => d.period);
  return {
    labels,
    datasets: [
      {
        label: 'Commits',
        data: props.data.map((d) => d.commits),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Fichiers modifiés',
        data: props.data.map((d) => d.filesChanged),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
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
