<script lang="ts">
  import Signup from './Signup.svelte';
  import HorizontalScroller from '$lib/ui/HorizontalScroller.svelte';
  import SectionTile from '$lib/ui/SectionTile.svelte';
  import CardItem from '$lib/ui/CardItem.svelte';
  import { cardLayout } from '$lib/stores/layout';
  import type { CardLayout } from '$lib/stores/layout';
  type Mode = 'default' | 'w-75' | 'fluid';

  let showHeading = $state(false);
  let selected: Mode = $state('default');
  interface Props {
    onChange?: (mode: Mode) => void;
    onLayoutChange?: (layout: CardLayout) => void;
  }
  let { onChange, onLayoutChange }: Props = $props();

  const selectMode = (mode: Mode) => {
    selected = mode;
    onChange?.(mode);
  };

  const selectLayout = (layout: CardLayout) => {
    cardLayout.set(layout);
    onLayoutChange?.(layout);
  };
</script>

<Signup />

<div id="options">
  <HorizontalScroller ariaLabel="Options cards" headingText="Options" bind:showHeading>
    <SectionTile title={!showHeading ? 'Options' : ''} />

    <div class="flex-shrink-0">
      <CardItem title="Container">
        {#snippet bodyExtra()}
          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="radioDefault"
              id="radioDefault1"
              checked={selected === 'default'}
              onchange={() => selectMode('default')}
            />
            <label class="form-check-label" for="radioDefault1"> Default </label>
          </div>
          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="radioDefault"
              id="radioDefault2"
              checked={selected === 'w-75'}
              onchange={() => selectMode('w-75')}
            />
            <label class="form-check-label" for="radioDefault2"> W-75 </label>
          </div>
          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="radioDefault"
              id="radioDefault3"
              checked={selected === 'fluid'}
              onchange={() => selectMode('fluid')}
            />
            <label class="form-check-label" for="radioDefault3"> Fluid </label>
          </div>
        {/snippet}
      </CardItem>
    </div>

    <div class="flex-shrink-0">
      <CardItem title="Layout">
        {#snippet bodyExtra()}
          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="radioLayout"
              id="radioLayoutVertical"
              checked={$cardLayout === 'vertical'}
              onchange={() => selectLayout('vertical')}
            />
            <label class="form-check-label" for="radioLayoutVertical"> Vertical </label>
          </div>
          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="radioLayout"
              id="radioLayoutHorizontal"
              checked={$cardLayout === 'horizontal'}
              onchange={() => selectLayout('horizontal')}
            />
            <label class="form-check-label" for="radioLayoutHorizontal"> Horizontal </label>
          </div>
        {/snippet}
      </CardItem>
    </div>
  </HorizontalScroller>
</div>
