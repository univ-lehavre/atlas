import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { theme, useOpenapi } from 'vitepress-openapi/client';
import 'vitepress-openapi/dist/style.css';

import spec from '../../openapi/redcap.yaml?raw';

export default {
  extends: DefaultTheme,
  async enhanceApp({ app }) {
    // Configure OpenAPI with REDCap spec (YAML string)
    useOpenapi({
      spec,
      config: {
        spec: {
          showServers: true,
        },
      },
    });
    theme.enhanceApp({ app });
  },
} satisfies Theme;
