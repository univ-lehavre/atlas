<script lang="ts">
  interface Props {
    label: string;
    variant?:
      | 'primary'
      | 'secondary'
      | 'success'
      | 'danger'
      | 'warning'
      | 'info'
      | 'light'
      | 'dark'
      | 'link';
    icon?: string;
    outline?: boolean;
    disabled?: boolean;
    size?: 'large' | 'small' | 'standard';
    href?: string;
    newTab?: boolean;
    onclick?: () => void;
  }

  const { label, onclick, variant, icon, outline, disabled, size, href, newTab }: Props = $props();

  const btnClass = $derived(`btn${outline ? '-outline' : ''}-${variant ? variant : 'primary'}`);
  const btnSize = $derived(size === 'large' ? 'btn-lg' : size === 'small' ? 'btn-sm' : '');
</script>

{#snippet content()}
  {#if icon}
    <i class="bi bi-{icon} me-1"></i>
  {/if}
  {label}
{/snippet}

{#if href}
  <a
    {href}
    class="btn {btnClass} {btnSize} {disabled ? 'disabled' : ''}"
    target={newTab ? '_blank' : '_self'}
    role="button"
  >
    {@render content()}
  </a>
{:else}
  <button {onclick} class="btn {btnClass} {btnSize}" {disabled}>
    {@render content()}
  </button>
{/if}
