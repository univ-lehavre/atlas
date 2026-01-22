<script lang="ts">
	interface Props {
		data: {
			user?: {
				username: string;
				email: string;
				name?: string;
				groups: string[];
			};
		};
	}

	let { data }: Props = $props();
</script>

<section class="hero">
	<h1>ECRIN Dashboard</h1>
	<p>Plateforme de gestion des donnees de recherche clinique</p>

	{#if data.user}
		<p>Bienvenue, <strong>{data.user.name ?? data.user.email}</strong></p>
		<a href="/dashboard" class="btn">Acceder au dashboard</a>
	{:else}
		<p>Connectez-vous pour acceder a vos donnees.</p>
		<a href="/authelia/" class="btn">Se connecter</a>
	{/if}
</section>

<section class="features">
	<div class="feature">
		<h3>Securise</h3>
		<p>Architecture Zero Trust avec authentification forte et chiffrement de bout en bout.</p>
	</div>
	<div class="feature">
		<h3>Conforme</h3>
		<p>Respect des normes RGPD et des bonnes pratiques de recherche clinique.</p>
	</div>
	<div class="feature">
		<h3>Collaboratif</h3>
		<p>Acces controle par roles et partage securise entre chercheurs.</p>
	</div>
</section>

<style>
	.hero {
		text-align: center;
		padding: 4rem 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.hero h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.hero p {
		font-size: 1.1rem;
		opacity: 0.9;
	}

	.btn {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.75rem 2rem;
		background: white;
		color: #667eea;
		text-decoration: none;
		border-radius: 4px;
		font-weight: 600;
	}

	.btn:hover {
		background: #f0f0f0;
	}

	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.feature {
		padding: 1.5rem;
		background: #f9f9f9;
		border-radius: 8px;
		border: 1px solid #eee;
	}

	.feature h3 {
		margin-bottom: 0.5rem;
		color: #333;
	}

	.feature p {
		color: #666;
		font-size: 0.95rem;
	}
</style>
