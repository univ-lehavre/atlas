import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import RepoDynamics from './components/RepoDynamics.vue';
import RedcapApiExplorer from './components/RedcapApiExplorer.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('RepoDynamics', RepoDynamics);
    app.component('RedcapApiExplorer', RedcapApiExplorer);
  },
} satisfies Theme;
