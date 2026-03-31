<script lang="ts">
  interface Props {
    users: { id: string; name: string }[];
    selectedUser: string | undefined;
    viewableSelector: boolean;
  }

  let { users, selectedUser = $bindable(), viewableSelector = $bindable() }: Props = $props();
</script>

<div class="btn-toolbar z-index-3" role="toolbar">
  <a type="button" class="btn btn-outline-secondary me-2" href="/" aria-label="Close">
    <i class="bi bi-house-door-fill"></i>
  </a>

  <div class="btn-group me-2" role="group">
    <input
      type="radio"
      class="btn-check"
      name="vbtn-radio"
      id="vbtn-radio1"
      autocomplete="off"
      checked
      onclick={() => (viewableSelector = true)}
    />
    <label class="btn btn-outline-secondary" for="vbtn-radio1">Ego</label>
    <input
      type="radio"
      class="btn-check"
      name="vbtn-radio"
      id="vbtn-radio2"
      autocomplete="off"
      onclick={() => (viewableSelector = false)}
    />
    <label class="btn btn-outline-secondary" for="vbtn-radio2">Community</label>
  </div>
  {#if viewableSelector}
    <div class="btn-group me-2" role="group">
      <div class="btn-group" role="group">
        <button
          type="button"
          class="btn btn-primary dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          Researchers
        </button>
        <ul class="dropdown-menu">
          {#each users as user (user.id)}
            <li>
              <button
                class="dropdown-item {user.id === selectedUser ? 'active' : ''}"
                onclick={() => (selectedUser = user.id)}>{user.name}</button
              >
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</div>
