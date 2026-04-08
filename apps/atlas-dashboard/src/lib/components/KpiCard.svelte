<script lang="ts">
  interface Props {
    label: string;
    value: number | string;
    sub?: string;
  }
  const { label, value, sub }: Props = $props();
</script>

<div class="kpi">
  <p class="label">{label}</p>
  <p class="value">{value}</p>
  {#if sub !== undefined}<p class="sub">{sub}</p>{/if}
</div>

<style>
  .kpi {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem 1.25rem;
  }

  .label {
    font-size: 0.78rem;
    color: #6b7280;
    margin: 0 0 0.3rem;
  }

  .value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .sub {
    font-size: 0.78rem;
    color: #9ca3af;
    margin: 0.2rem 0 0;
  }
</style>
