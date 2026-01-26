<script lang="ts">
  interface User {
    id: string;
    email: string;
    name: string;
    groups: string[];
  }

  interface Props {
    data: {
      user: {
        username: string;
        email: string;
        groups: string[];
      };
      users: User[];
      error?: string;
    };
  }

  let { data }: Props = $props();
</script>

<h1>Gestion des utilisateurs</h1>

{#if data.error}
  <div class="error">
    <p>{data.error}</p>
  </div>
{/if}

{#if data.users.length === 0}
  <p class="empty">Aucun utilisateur trouve.</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>Email</th>
        <th>Nom</th>
        <th>Groupes</th>
      </tr>
    </thead>
    <tbody>
      {#each data.users as user}
        <tr>
          <td>{user.email}</td>
          <td>{user.name}</td>
          <td>
            {#each user.groups as group}
              <span class="badge">{group}</span>
            {/each}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  h1 {
    margin-bottom: 1.5rem;
  }

  .error {
    background: #ffebee;
    color: #c62828;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .empty {
    color: #666;
    font-style: italic;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }

  th,
  td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }

  th {
    background: #f5f5f5;
    font-weight: 600;
    color: #333;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #fafafa;
  }

  .badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    margin-right: 0.25rem;
    background: #e3f2fd;
    color: #1565c0;
    border-radius: 3px;
    font-size: 0.85rem;
  }
</style>
