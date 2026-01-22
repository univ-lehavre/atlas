<script lang="ts">
	interface Props {
		data: {
			user: {
				username: string;
				email: string;
				name?: string;
				groups: string[];
			};
			serviceStatus: string;
		};
	}

	let { data }: Props = $props();
</script>

<h1>Dashboard</h1>

<section class="user-card">
	<h2>Votre profil</h2>
	<dl>
		<dt>Email</dt>
		<dd>{data.user.email}</dd>
		<dt>Nom d'utilisateur</dt>
		<dd>{data.user.username}</dd>
		{#if data.user.name}
			<dt>Nom</dt>
			<dd>{data.user.name}</dd>
		{/if}
		<dt>Groupes</dt>
		<dd>{data.user.groups.length > 0 ? data.user.groups.join(', ') : 'Aucun'}</dd>
	</dl>
</section>

<section class="status-card">
	<h2>Etat des services</h2>
	<div class="status-item">
		<span>REDCap Service</span>
		<span class="status" class:ok={data.serviceStatus === 'ok'}>
			{data.serviceStatus}
		</span>
	</div>
</section>

<section class="quick-links">
	<h2>Acces rapide</h2>
	<div class="links">
		<a href="/records" class="link-card">
			<h3>Records</h3>
			<p>Consulter et gerer les enregistrements</p>
		</a>
		{#if data.user.groups.includes('admin')}
			<a href="/users" class="link-card">
				<h3>Utilisateurs</h3>
				<p>Gerer les utilisateurs et leurs acces</p>
			</a>
		{/if}
	</div>
</section>

<style>
	h1 {
		margin-bottom: 1.5rem;
	}

	h2 {
		font-size: 1.2rem;
		margin-bottom: 1rem;
		color: #333;
	}

	section {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.user-card dl {
		display: grid;
		grid-template-columns: 150px 1fr;
		gap: 0.5rem;
	}

	.user-card dt {
		color: #666;
		font-weight: 500;
	}

	.user-card dd {
		color: #333;
	}

	.status-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}

	.status {
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		background: #ffebee;
		color: #c62828;
		font-size: 0.9rem;
	}

	.status.ok {
		background: #e8f5e9;
		color: #2e7d32;
	}

	.links {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.link-card {
		display: block;
		padding: 1rem;
		background: #f5f5f5;
		border-radius: 6px;
		text-decoration: none;
		transition: background 0.2s;
	}

	.link-card:hover {
		background: #eeeeee;
	}

	.link-card h3 {
		margin-bottom: 0.25rem;
		color: #333;
	}

	.link-card p {
		font-size: 0.9rem;
		color: #666;
	}
</style>
