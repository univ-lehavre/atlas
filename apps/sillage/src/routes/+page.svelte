<script lang="ts">
  import AnonymousHome from '@univ-lehavre/atlas-ui/AnonymousHome.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<AnonymousHome signupUrl="/signup" researchers={data.researchers} />
