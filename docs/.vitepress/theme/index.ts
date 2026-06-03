import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import RepoDynamics from "./components/RepoDynamics.vue";
import CrfApiExplorer from "./components/CrfApiExplorer.vue";
import DocBadge from "./components/kpi/DocBadge.vue";
import PackagesBadge from "./components/kpi/PackagesBadge.vue";
import ActivityBadge from "./components/kpi/ActivityBadge.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("RepoDynamics", RepoDynamics);
    app.component("CrfApiExplorer", CrfApiExplorer);
    app.component("DocBadge", DocBadge);
    app.component("PackagesBadge", PackagesBadge);
    app.component("ActivityBadge", ActivityBadge);
  },
} satisfies Theme;
