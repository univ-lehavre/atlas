<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { data as history } from "../../data/kpi-history.data";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

type MetricKey = "lines" | "statements" | "functions" | "branches";

const metricConfig: Record<MetricKey, { label: string; color: string }> = {
  lines: { label: "Lignes", color: "rgb(34, 197, 94)" },
  statements: { label: "Instructions", color: "rgb(59, 130, 246)" },
  functions: { label: "Fonctions", color: "rgb(168, 85, 247)" },
  branches: { label: "Branches", color: "rgb(245, 158, 11)" },
};

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});

const chartData = computed(() => ({
  labels: history.map((d) => d.date),
  datasets: (Object.keys(metricConfig) as MetricKey[]).map((metric) => ({
    label: metricConfig[metric].label,
    data: history.map((d) => d[metric]),
    borderColor: metricConfig[metric].color,
    backgroundColor: metricConfig[metric].color
      .replace("rgb", "rgba")
      .replace(")", ", 0.1)"),
    fill: false,
    tension: 0.3,
  })),
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" as const },
    title: { display: true, text: "Couverture de tests par jour (%)" },
  },
  scales: {
    y: { beginAtZero: true, max: 100 },
  },
}));
</script>

<template>
  <div class="coverage-trend" style="height: 320px">
    <Line
      v-if="isMounted && history.length > 0"
      :data="chartData"
      :options="chartOptions"
    />
    <div v-else class="no-data">
      Aucun instantané de couverture pour l'instant — la série se remplit une
      fois par jour sur <code>main</code>. Revenez après le prochain passage
      planifié.
    </div>
  </div>
</template>

<style scoped>
.coverage-trend {
  width: 100%;
  position: relative;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 1rem;
  text-align: center;
  color: var(--vp-c-text-2);
  font-style: italic;
}
</style>
