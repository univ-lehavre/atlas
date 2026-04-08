<script lang="ts">
  import * as Plot from '@observablehq/plot';
  import type { NpmDailyPoint } from '$lib/types.js';

  interface Props {
    data: NpmDailyPoint[];
    width?: number;
    height?: number;
  }

  const { data, width = 120, height = 32 }: Props = $props();

  const plotAction = (
    node: HTMLElement,
    opts: Plot.PlotOptions
  ): { update: (o: Plot.PlotOptions) => void; destroy: () => void } => {
    node.append(Plot.plot(opts));
    return {
      update(newOpts: Plot.PlotOptions) {
        node.innerHTML = '';
        node.append(Plot.plot(newOpts));
      },
      destroy() {
        node.innerHTML = '';
      },
    };
  };

  const options = $derived<Plot.PlotOptions>({
    width,
    height,
    axis: null,
    margin: 0,
    marks: [
      Plot.areaY(data, {
        x: (d: NpmDailyPoint) => new Date(d.day),
        y: 'downloads',
        fill: '#2563eb',
        fillOpacity: 0.15,
      }),
      Plot.lineY(data, {
        x: (d: NpmDailyPoint) => new Date(d.day),
        y: 'downloads',
        stroke: '#2563eb',
        strokeWidth: 1.5,
      }),
    ],
  });
</script>

<div use:plotAction={options} style="line-height: 0"></div>
