<script lang="ts">
  import Sigma from 'sigma';
  import Graph from 'graphology';
  import { onMount } from 'svelte';
  import { random } from 'graphology-layout';
  import forceAtlas2 from 'graphology-layout-forceatlas2';
  import { createNodeImageProgram } from '@sigma/node-image';
  import { NodeBorderProgram } from '@sigma/node-border';
  import FA2Layout from 'graphology-layout-forceatlas2/worker';

  let { network, fullscreen = true } = $props();
  let sigma_container: HTMLElement;

  onMount(() => {
    const graph = Graph.from(network);
    random.assign(graph);

    const sensibleSettings = forceAtlas2.inferSettings(graph);
    const layout = new FA2Layout(graph, { settings: sensibleSettings });

    const renderer = new Sigma(graph, sigma_container, {
      //allowInvalidContainer: true,
      //defaultEdgeType: 'image',
      nodeProgramClasses: {
        image: createNodeImageProgram({ keepWithinCircle: true, correctCentering: true }),
        border: NodeBorderProgram,
      },
    });

    layout.start();

    return () => {
      layout.stop();
      layout.kill();
      renderer.kill();
    };
  });
</script>

<div bind:this={sigma_container} class="sigma-container" class:fullscreen></div>

<style>
  .sigma-container {
    width: 100%;
    height: 600px;
    overflow: hidden;
  }

  .sigma-container.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 0;
  }
</style>
