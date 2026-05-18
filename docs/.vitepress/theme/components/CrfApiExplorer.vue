<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useData } from 'vitepress';

interface RedcapVersion {
  version: string;
  label: string;
  specUrl: string;
  endpoints: number;
}

const props = withDefaults(
  defineProps<{
    defaultVersion?: string;
  }>(),
  {
    defaultVersion: '16.0.8',
  }
);

const { isDark } = useData();

const versions: RedcapVersion[] = [
  {
    version: '16.0.8',
    label: 'REDCap 16.0.8 (Latest)',
    specUrl: '/atlas/openapi/redcap-16.0.8.yaml',
    endpoints: 64,
  },
  {
    version: '15.5.32',
    label: 'REDCap 15.5.32',
    specUrl: '/atlas/openapi/redcap-15.5.32.yaml',
    endpoints: 64,
  },
  {
    version: '14.5.10',
    label: 'REDCap 14.5.10',
    specUrl: '/atlas/openapi/redcap-14.5.10.yaml',
    endpoints: 62,
  },
];

const selectedVersion = ref(props.defaultVersion);
const isMounted = ref(false);
const redocContainer = ref<HTMLElement | null>(null);

const currentSpec = computed(() => {
  return versions.find((v) => v.version === selectedVersion.value) || versions[0];
});

const handleVersionChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  selectedVersion.value = target.value;
};

const initRedoc = async () => {
  if (!redocContainer.value || typeof window === 'undefined') return;

  // Clear previous instance
  redocContainer.value.innerHTML = '';

  // Wait for Redoc to be available
  const Redoc = (window as unknown as { Redoc?: { init: Function } }).Redoc;
  if (!Redoc) {
    console.error('Redoc not loaded');
    return;
  }

  const options = {
    scrollYOffset: 64,
    hideDownloadButton: false,
    hideHostname: true,
    expandResponses: '200,201',
    jsonSampleExpandLevel: 2,
    nativeScrollbars: true,
    showExtensions: true,
    theme: {
      colors: {
        primary: {
          main: isDark.value ? '#a8b1ff' : '#5468ff',
        },
        text: {
          primary: isDark.value ? '#e5e7eb' : '#1f2937',
          secondary: isDark.value ? '#9ca3af' : '#6b7280',
        },
        http: {
          get: '#10b981',
          post: '#3b82f6',
          put: '#f59e0b',
          delete: '#ef4444',
        },
      },
      typography: {
        fontSize: '15px',
        fontFamily: 'var(--vp-font-family-base)',
        headings: {
          fontFamily: 'var(--vp-font-family-base)',
        },
        code: {
          fontFamily: 'var(--vp-font-family-mono)',
          fontSize: '13px',
        },
      },
      sidebar: {
        backgroundColor: isDark.value ? '#1a1a1a' : '#f9fafb',
        textColor: isDark.value ? '#e5e7eb' : '#1f2937',
        width: '260px',
      },
      rightPanel: {
        backgroundColor: isDark.value ? '#0d0d0d' : '#1f2937',
      },
    },
  };

  try {
    await Redoc.init(currentSpec.value.specUrl, options, redocContainer.value);
  } catch (error) {
    console.error('Failed to initialize Redoc:', error);
  }
};

onMounted(() => {
  isMounted.value = true;
  // Load Redoc from CDN
  const script = document.createElement('script');
  script.src = 'https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js';
  script.onload = () => {
    nextTick(() => initRedoc());
  };
  document.head.appendChild(script);
});

watch([selectedVersion, isDark], () => {
  if (isMounted.value) {
    nextTick(() => initRedoc());
  }
});
</script>

<template>
  <div class="redcap-api-explorer">
    <div class="explorer-header">
      <div class="version-selector">
        <label for="version-select">REDCap Version:</label>
        <select
          id="version-select"
          :value="selectedVersion"
          class="version-select"
          @change="handleVersionChange"
        >
          <option v-for="version in versions" :key="version.version" :value="version.version">
            {{ version.label }}
          </option>
        </select>
      </div>

      <div class="spec-info">
        <span class="badge">OpenAPI 3.1.0</span>
        <span class="badge">{{ currentSpec.endpoints }} endpoints</span>
        <span class="badge">36 tags</span>
      </div>
    </div>

    <div class="redoc-wrapper">
      <ClientOnly>
        <div ref="redocContainer" class="redoc-container">
          <div v-if="!isMounted" class="loading">Chargement de la documentation...</div>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.redcap-api-explorer {
  margin: 0 auto;
  max-width: 90vw;
}

.explorer-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background-color: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  position: sticky;
  top: var(--vp-nav-height);
  z-index: 10;
}

.version-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.version-selector label {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.version-select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.version-select:hover {
  border-color: var(--vp-c-brand-1);
}

.version-select:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.spec-info {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 12px;
}

.redoc-wrapper {
  min-height: calc(100vh - 200px);
}

.redoc-container {
  min-height: 600px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: var(--vp-c-text-2);
  font-size: 1rem;
}

@media (max-width: 640px) {
  .explorer-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .version-selector {
    width: 100%;
  }

  .version-select {
    flex: 1;
  }
}
</style>

<style>
/* Global Redoc overrides */
.redoc-wrap {
  background: var(--vp-c-bg) !important;
}

.api-content {
  background: var(--vp-c-bg) !important;
}
</style>
