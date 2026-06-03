<script setup lang="ts">
import { computed } from "vue";
import { data as stats } from "../../data/repo-stats";

// Encart « documentation inline » pour la page Documentation. Lit repo-stats
// (classe C, régénéré au build, jamais commité) : densité de commentaires
// TSDoc rapportée à la surface de code, et volume de fichiers documentés.

const code = computed(() => stats.current.code);

const density = computed(() => {
  const surface = code.value.functions + code.value.constants;
  if (surface === 0) return 0;
  return Math.round((code.value.tsdocComments / surface) * 100);
});

const available = computed(() => code.value.files > 0);
</script>

<template>
  <div class="kpi-card" v-if="available">
    <div class="kpi-head">Documentation du code</div>
    <div class="kpi-grid">
      <div class="kpi-metric">
        <span class="kpi-value">{{ code.tsdocComments }}</span>
        <span class="kpi-label">Blocs TSDoc</span>
      </div>
      <div class="kpi-metric">
        <span class="kpi-value">{{ density }}%</span>
        <span class="kpi-label">Densité / surface exportée</span>
      </div>
      <div class="kpi-metric">
        <span class="kpi-value">{{ code.files }}</span>
        <span class="kpi-label">Fichiers source</span>
      </div>
    </div>
    <div class="kpi-foot">
      Densité = blocs TSDoc rapportés aux fonctions et constantes exportées.
      Régénéré à chaque build (<code>pnpm stats:generate</code>).
    </div>
  </div>
  <div class="kpi-card kpi-empty" v-else>
    Statistiques de code non générées (<code>pnpm stats:generate</code>).
  </div>
</template>

<style scoped>
@import "./kpi-card.css";
</style>
