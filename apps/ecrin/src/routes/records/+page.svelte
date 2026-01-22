<script lang="ts">
	interface Record {
		id: string;
		data: Record<string, unknown>;
		createdAt: string;
		updatedAt: string;
		owner?: string;
	}

	interface Props {
		data: {
			user: {
				username: string;
				email: string;
				groups: string[];
			};
			records: Record[];
			error?: string;
		};
	}

	let { data }: Props = $props();
</script>

<h1>Records</h1>

{#if data.error}
	<div class="error">
		<p>{data.error}</p>
	</div>
{/if}

{#if data.records.length === 0}
	<p class="empty">Aucun enregistrement disponible.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>ID</th>
				<th>Proprietaire</th>
				<th>Cree le</th>
				<th>Modifie le</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.records as record}
				<tr>
					<td><a href="/records/{record.id}">{record.id}</a></td>
					<td>{record.owner ?? '-'}</td>
					<td>{new Date(record.createdAt).toLocaleDateString('fr-FR')}</td>
					<td>{new Date(record.updatedAt).toLocaleDateString('fr-FR')}</td>
					<td>
						<a href="/records/{record.id}">Voir</a>
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

	a {
		color: #667eea;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
