<script lang="ts">
  import { onMount } from 'svelte';

  let { hasIncompleteRequests, hasRequestsInProgress } = $props();
  let navEl: HTMLElement | undefined;

  onMount(() => {
    const updateOffset = () => {
      if (!navEl) return;
      const h = Math.ceil(navEl.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--nav-offset', `${h}px`);
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  });
</script>

<nav
  id="navbar1"
  class="navbar sticky-top px-3 mb-3 justify-content-center bg-transparent"
  bind:this={navEl}
>
  <ul class="nav nav-tabs justify-content-center">
    <li class="nav-item">
      <a class="nav-link" href="#collaborate"
        ><i class="bi bi-people me-0 me-md-2" aria-hidden="true"></i><span
          class="d-none d-md-inline">Déposer</span
        ></a
      >
    </li>
    {#if hasIncompleteRequests}
      <li class="nav-item">
        <a class="nav-link" href="#complete"
          ><i class="bi bi-pencil-square me-0 me-md-2" aria-hidden="true"></i><span
            class="d-none d-md-inline">Compléter</span
          ></a
        >
      </li>
    {/if}
    {#if hasRequestsInProgress}
      <li class="nav-item">
        <a class="nav-link" href="#follow"
          ><i class="bi bi-hourglass-split me-0 me-md-2" aria-hidden="true"></i><span
            class="d-none d-md-inline">Suivre</span
          ></a
        >
      </li>
    {/if}
    <li class="nav-item">
      <a class="nav-link" href="#retrieve"
        ><i class="bi bi-archive me-0 me-md-2" aria-hidden="true"></i><span
          class="d-none d-md-inline">Retrouver</span
        ></a
      >
    </li>
    <li class="nav-item">
      <a class="nav-link" href="#administrate"
        ><i class="bi bi-gear me-0 me-md-2" aria-hidden="true"></i><span class="d-none d-md-inline"
          >Administrer</span
        ></a
      >
    </li>
  </ul>
</nav>
