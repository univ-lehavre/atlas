import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import RepoDynamics from "./components/RepoDynamics.vue";
import CrfApiExplorer from "./components/CrfApiExplorer.vue";
import CoverageTrend from "./components/CoverageTrend.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("RepoDynamics", RepoDynamics);
    app.component("CrfApiExplorer", CrfApiExplorer);
    app.component("CoverageTrend", CoverageTrend);
  },
} satisfies Theme;
