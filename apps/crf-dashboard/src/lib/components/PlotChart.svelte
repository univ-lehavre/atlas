<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import { onDestroy } from 'svelte';

  interface Props {
    options: Plot.PlotOptions;
    title?: string;
  }

  const { options, title }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let chart: (HTMLElement | SVGSVGElement) | null = null;

  const plotAction = (node: HTMLElement, opts: Plot.PlotOptions) => {
    chart = Plot.plot(opts) as HTMLElement | SVGSVGElement;
    node.append(chart);
    return {
      update(newOpts: Plot.PlotOptions) {
        node.innerHTML = '';
        chart = Plot.plot(newOpts) as HTMLElement | SVGSVGElement;
        node.append(chart);
      },
      destroy() {
        node.innerHTML = '';
      },
    };
  };

  onDestroy(() => {
    container?.replaceChildren();
  });
</script>

<div class="chart-wrapper">
  {#if title}
    <h3 class="chart-title">{title}</h3>
  {/if}
  <div use:plotAction={options}></div>
</div>

<style>
  .chart-wrapper {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.25rem;
  }

  .chart-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.75rem;
  }
</style>
