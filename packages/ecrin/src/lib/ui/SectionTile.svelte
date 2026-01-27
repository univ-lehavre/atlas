<script lang="ts">
  interface Props {
    title: string;
    width?: string;
  }
  let { title, width = '18rem' }: Props = $props();
</script>

<div class="flex-shrink-0">
  <div style={`width: var(--card-width, ${width});`}>
    <div class="fw-bolder fs-3" style="font-family: Gambetta; ">
      {title}
    </div>
  </div>
</div>
