<script lang="ts">
  import AnonymousHome from '@univ-lehavre/atlas-ui/AnonymousHome.svelte';
  import SignupModal from '@univ-lehavre/atlas-ui/SignupModal.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let signupOpen = $state(false);

  type SignupResponse = {
    data: { signedUp: true; createdAt: string } | null;
    error: { code: string; message: string } | null;
  };

  async function handleSignup(email: string): Promise<void> {
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const payload = (await res.json()) as SignupResponse;
    if (!res.ok || payload.error) {
      throw new Error(payload.error?.message ?? `Erreur ${res.status}`);
    }
  }

  async function handleLogout(): Promise<void> {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    location.assign('/');
  }
</script>

{#if data.userId}
  <section class="authenticated">
    <h1>Bonjour</h1>
    <p>
      Vous êtes connecté en tant que <code>{data.userId}</code>. La homepage authentifiée (carrousel
      projets + invitation questionnaires) arrive en phase&nbsp;5.
    </p>
    <button type="button" class="logout" onclick={handleLogout}> Se déconnecter </button>
  </section>
{:else}
  <AnonymousHome
    signupUrl="/signup"
    researchers={data.researchers}
    onSignupClick={() => (signupOpen = true)}
  />
  <SignupModal bind:open={signupOpen} onSubmit={handleSignup} />
{/if}

<style>
  .authenticated {
    max-width: 36rem;
    margin: 4rem auto;
    padding: 0 1.5rem;
    text-align: center;
  }
  .authenticated h1 {
    font-size: 1.75rem;
    color: #0a2540;
  }
  .authenticated p {
    color: #4b5563;
    line-height: 1.5;
  }
  .logout {
    margin-top: 1.5rem;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid #d1d5db;
    background: white;
    color: #1f2937;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }
  .logout:hover,
  .logout:focus-visible {
    background: #f3f4f6;
  }
</style>
