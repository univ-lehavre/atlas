<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  /**
   * DataTable - Tableau de données générique et stylé
   *
   * Composant de tableau réutilisable avec support du dark mode,
   * colonnes personnalisables et rendu de cellules via snippets.
   *
   * @example Simple
   * ```svelte
   * <DataTable data={users} columns={[
   *   { key: 'name', label: 'Nom' },
   *   { key: 'email', label: 'Email' }
   * ]} />
   * ```
   *
   * @example Avec cellule personnalisée
   * ```svelte
   * <DataTable data={commits} columns={columns}>
   *   {#snippet cell(item, column)}
   *     {#if column.key === 'additions'}
   *       <span class="text-success-600">+{item.additions}</span>
   *     {:else if column.key === 'deletions'}
   *       <span class="text-error-600">-{item.deletions}</span>
   *     {:else}
   *       {item[column.key]}
   *     {/if}
   *   {/snippet}
   * </DataTable>
   * ```
   */

  interface Column<T> {
    /** Unique key matching data property */
    key: keyof T | string;
    /** Display label for header */
    label: string;
    /** Column alignment */
    align?: 'left' | 'center' | 'right';
    /** CSS width (e.g., '100px', '20%') */
    width?: string;
    /** Custom header CSS class */
    headerClass?: string;
    /** Custom cell CSS class */
    cellClass?: string;
  }

  interface Props<T> {
    /** Array of data items */
    data: T[];
    /** Column definitions */
    columns: Column<T>[];
    /** Unique key for each row (defaults to index) */
    rowKey?: keyof T;
    /** Enable striped rows */
    striped?: boolean;
    /** Enable hover effect on rows */
    hoverable?: boolean;
    /** Compact padding */
    compact?: boolean;
    /** Custom cell renderer */
    cell?: Snippet<[T, Column<T>, number]>;
    /** Empty state content */
    empty?: Snippet;
    /** Caption/title for accessibility */
    caption?: string;
    /** Additional CSS classes for table container */
    class?: string;
  }

  let {
    data,
    columns,
    rowKey,
    striped = false,
    hoverable = true,
    compact = false,
    cell,
    empty,
    caption,
    class: className = '',
  }: Props<T> = $props();

  const getRowKey = (item: T, index: number): string | number => {
    if (rowKey && item[rowKey] !== undefined) {
      return String(item[rowKey]);
    }
    return index;
  };

  const getCellValue = (item: T, key: keyof T | string): unknown => {
    return item[key as keyof T];
  };
</script>

<div class="data-table-container {className}">
  <div class="table-scroll">
    <table
      class="data-table"
      data-striped={striped}
      data-hoverable={hoverable}
      data-compact={compact}
    >
      {#if caption}
        <caption class="sr-only">{caption}</caption>
      {/if}
      <thead class="data-table-head">
        <tr>
          {#each columns as column (column.key)}
            <th
              class="data-table-th {column.headerClass ?? ''}"
              style:width={column.width}
              style:text-align={column.align ?? 'left'}
            >
              {column.label}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="data-table-body">
        {#if data.length === 0 && empty}
          <tr>
            <td colspan={columns.length} class="data-table-empty">
              {@render empty()}
            </td>
          </tr>
        {:else}
          {#each data as item, rowIndex (getRowKey(item, rowIndex))}
            <tr class="data-table-row">
              {#each columns as column (column.key)}
                <td
                  class="data-table-td {column.cellClass ?? ''}"
                  style:text-align={column.align ?? 'left'}
                >
                  {#if cell}
                    {@render cell(item, column, rowIndex)}
                  {:else}
                    {getCellValue(item, column.key)}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<style>
  .data-table-container {
    background-color: white;
    border: 1px solid var(--color-secondary-200);
    border-radius: var(--radius-xl);
    overflow: hidden;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  :global(.dark) .data-table-container {
    background-color: var(--color-secondary-800);
    border-color: var(--color-secondary-700);
  }

  .table-scroll {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  /* Header */
  .data-table-head {
    background-color: var(--color-secondary-50);
  }

  :global(.dark) .data-table-head {
    background-color: var(--color-secondary-900);
  }

  .data-table-th {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-secondary-500);
    border-bottom: 1px solid var(--color-secondary-200);
    white-space: nowrap;
  }

  :global(.dark) .data-table-th {
    color: var(--color-secondary-400);
    border-color: var(--color-secondary-700);
  }

  .data-table[data-compact='true'] .data-table-th {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  /* Body */
  .data-table-body {
    background-color: white;
  }

  :global(.dark) .data-table-body {
    background-color: var(--color-secondary-800);
  }

  .data-table-row {
    transition: background-color var(--transition-fast);
  }

  .data-table-row:not(:last-child) {
    border-bottom: 1px solid var(--color-secondary-200);
  }

  :global(.dark) .data-table-row:not(:last-child) {
    border-color: var(--color-secondary-700);
  }

  /* Striped */
  .data-table[data-striped='true'] .data-table-row:nth-child(even) {
    background-color: var(--color-secondary-50);
  }

  :global(.dark) .data-table[data-striped='true'] .data-table-row:nth-child(even) {
    background-color: var(--color-secondary-900);
  }

  /* Hoverable */
  .data-table[data-hoverable='true'] .data-table-row:hover {
    background-color: var(--color-secondary-50);
  }

  :global(.dark) .data-table[data-hoverable='true'] .data-table-row:hover {
    background-color: var(--color-secondary-700);
  }

  /* Cells */
  .data-table-td {
    padding: var(--spacing-md) var(--spacing-lg);
    color: var(--color-secondary-900);
    white-space: nowrap;
  }

  :global(.dark) .data-table-td {
    color: var(--color-secondary-100);
  }

  .data-table[data-compact='true'] .data-table-td {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  /* Empty state */
  .data-table-empty {
    padding: var(--spacing-2xl);
    text-align: center;
    color: var(--color-secondary-500);
  }

  :global(.dark) .data-table-empty {
    color: var(--color-secondary-400);
  }

  /* Accessibility */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
