<script setup lang="ts">
import { computed } from "vue";
import { data as history } from "../../../data/kpi-history.data";

// Encart « couverture » pour la page Tests. Lit la série append-only
// kpi-history.json (classe B, ADR 0032) : le dernier instantané daté donne la
// couverture courante, l'avant-dernier la tendance. Tant que le cron n'a pas
// produit de point, l'encart affiche un état « en attente » plutôt qu'un zéro
// trompeur.

const latest = computed(() =>
  history.length > 0 ? history[history.length - 1] : null,
);
const previous = computed(() =>
  history.length > 1 ? history[history.length - 2] : null,
);

const delta = computed(() => {
  if (!latest.value || !previous.value) return null;
  return Math.round((latest.value.lines - previous.value.lines) * 10) / 10;
});

const trend = computed(() => {
  if (delta.value === null || delta.value === 0) return "→";
  return delta.value > 0 ? "▲" : "▼";
});
</script>

<template>
  <div class="kpi-card" v-if="latest">
    <div class="kpi-head">Couverture de tests</div>
    <div class="kpi-grid">
      <div class="kpi-metric">
        <span class="kpi-value">{{ latest.lines }}%</span>
        <span class="kpi-label">Lignes</span>
      </div>
      <div class="kpi-metric">
        <span class="kpi-value">{{ latest.branches }}%</span>
        <span class="kpi-label">Branches</span>
      </div>
      <div class="kpi-metric">
        <span class="kpi-value">{{ latest.functions }}%</span>
        <span class="kpi-label">Fonctions</span>
      </div>
    </div>
    <div class="kpi-foot" v-if="delta !== null">
      Tendance : <strong>{{ trend }} {{ Math.abs(delta) }} pt</strong> sur les
      lignes depuis le précédent instantané ({{ latest.date }}).
    </div>
    <div class="kpi-foot" v-else>
      Premier instantané du {{ latest.date }} — la tendance apparaîtra au
      suivant.
    </div>
  </div>
  <div class="kpi-card kpi-empty" v-else>
    Couverture pas encore historisée : la série se remplit une fois par jour sur
    <code>main</code> (voir le <a href="./tableau-de-bord">tableau de bord</a>).
  </div>
</template>

<style scoped>
@import "./kpi-card.css";
</style>
