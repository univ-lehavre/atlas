import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import RepoDynamics from './components/RepoDynamics.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('RepoDynamics', RepoDynamics);
  },
} satisfies Theme;
