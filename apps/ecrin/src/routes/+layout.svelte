<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		data: {
			user?: {
				username: string;
				email: string;
				name?: string;
				groups: string[];
			};
		};
	}

	let { children, data }: Props = $props();
</script>

<svelte:head>
	<title>ECRIN Dashboard</title>
</svelte:head>

<div class="app">
	<header>
		<nav>
			<a href="/">Accueil</a>
			<a href="/about">A propos</a>
			{#if data.user}
				<a href="/dashboard">Dashboard</a>
				<a href="/records">Records</a>
				{#if data.user.groups.includes('admin')}
					<a href="/users">Utilisateurs</a>
				{/if}
			{/if}
		</nav>
		<div class="user-info">
			{#if data.user}
				<span>{data.user.name ?? data.user.email}</span>
				<a href="/authelia/logout">Deconnexion</a>
			{:else}
				<a href="/authelia/">Connexion</a>
			{/if}
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>ECRIN - European Clinical Research Infrastructure Network</p>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: #f5f5f5;
		border-bottom: 1px solid #ddd;
	}

	nav {
		display: flex;
		gap: 1.5rem;
	}

	nav a {
		color: #333;
		text-decoration: none;
	}

	nav a:hover {
		text-decoration: underline;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	main {
		flex: 1;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	footer {
		padding: 1rem 2rem;
		background: #f5f5f5;
		border-top: 1px solid #ddd;
		text-align: center;
		color: #666;
	}
</style>
