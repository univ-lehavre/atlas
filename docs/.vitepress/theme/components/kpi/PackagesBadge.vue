<script setup lang="ts">
import { computed } from "vue";
import { data as stats } from "../../../data/repo-stats.data";

// Encart « paquets » pour les pages Architecture. Lit repo-stats (classe C) :
// nombre de paquets suivis, dont publiés, et volume de code agrégé.

const packages = computed(() => stats.packages);
const published = computed(
  () => packages.value.filter((p) => !p.private).length,
);
const totalCode = computed(() => stats.current.code.files);
const available = computed(() => packages.value.length > 0);
</script>

<template>
  <div class="kpi-card" v-if="available">
    <div class="kpi-head">Paquets du monorepo</div>
    <div class="kpi-grid">
      <div class="kpi-metric">
        <span class="kpi-value">{{ packages.length }}</span>
        <span class="kpi-label">Paquets suivis</span>
      </div>
      <div class="kpi-metric">
        <span class="kpi-value">{{ published }}</span>
        <span class="kpi-label">Publiés</span>
      </div>
      <div class="kpi-metric">
        <span class="kpi-value">{{ totalCode }}</span>
        <span class="kpi-label">Fichiers source</span>
      </div>
    </div>
    <div class="kpi-foot">
      Pour la carte détaillée (rôle, dépendances internes), voir
      <a href="./packages">la carte des paquets</a>.
    </div>
  </div>
  <div class="kpi-card kpi-empty" v-else>
    Statistiques de paquets non générées (<code>pnpm stats:generate</code>).
  </div>
</template>

<style scoped>
@import "./kpi-card.css";
</style>
