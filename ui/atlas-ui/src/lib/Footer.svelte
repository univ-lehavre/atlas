<script lang="ts">
  interface Logo {
    src: string;
    alt: string;
  }
  interface Props {
    /** Partner / funder logos rendered side-by-side in the footer. The
     * consumer app owns the actual list (proper names + asset paths) ;
     * the component only handles layout. */
    logos: Logo[];
  }
  let { logos }: Props = $props();
</script>

<footer class="footer py-4">
  <div class="container">
    <div
      class="d-flex justify-content-center align-items-center gap-4 flex-wrap"
    >
      {#each logos as logo (logo.src)}
        <img src={logo.src} alt={logo.alt} class="logo" />
      {/each}
    </div>
  </div>
</footer>

<style>
  .footer {
    background-color: #fff;
  }

  .logo {
    height: 60px;
    width: auto;
    object-fit: contain;
  }
</style>
