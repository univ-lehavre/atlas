<script lang="ts">
  import { onMount } from 'svelte';

  let { user } = $props();

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
  class="navbar sticky-top bg-body px-3 mb-3 justify-content-center"
  bind:this={navEl}
>
  <ul class="nav nav-tabs justify-content-center">
    <li class="nav-item">
      <a class="nav-link" href="#introduce"
        ><i class="bi bi-info-circle me-0 me-md-2" aria-hidden="true"></i><span
          class="d-none d-md-inline">Introduce</span
        ></a
      >
    </li>
    <li class="nav-item">
      <a class="nav-link" href="#collaborate"
        ><i class="bi bi-people me-0 me-md-2" aria-hidden="true"></i><span
          class="d-none d-md-inline">Collaborate</span
        ></a
      >
    </li>
    <li class="nav-item">
      <a class="nav-link" href="#explore"
        ><i class="bi bi-search me-0 me-md-2" aria-hidden="true"></i><span
          class="d-none d-md-inline">Explore</span
        ></a
      >
    </li>
    <li class="nav-item">
      <a class="nav-link" href="#ask"
        ><i class="bi bi-question-circle me-0 me-md-2" aria-hidden="true"></i><span
          class="d-none d-md-inline">Ask</span
        ></a
      >
    </li>
    <li class="nav-item">
      <a class="nav-link" href="#publish"
        ><i class="bi bi-megaphone me-0 me-md-2" aria-hidden="true"></i><span
          class="d-none d-md-inline">Publish</span
        ></a
      >
    </li>
    <li class="nav-item">
      <a class="nav-link" href="#administrate"
        ><i class="bi bi-gear me-0 me-md-2" aria-hidden="true"></i><span class="d-none d-md-inline"
          >Administrate</span
        ></a
      >
    </li>
    {#if user?.labels?.includes('admin')}
      <li class="nav-item">
        <a class="nav-link" href="#options"
          ><i class="bi bi-sliders me-0 me-md-2" aria-hidden="true"></i><span
            class="d-none d-md-inline">Options</span
          ></a
        >
      </li>
    {/if}
  </ul>
</nav>
