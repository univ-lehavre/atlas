<script lang="ts">
  import AnonymousHome from '@univ-lehavre/atlas-ui/AnonymousHome.svelte';
  import AuthenticatedHome from '@univ-lehavre/atlas-ui/AuthenticatedHome.svelte';
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

  // Until REDCap profile state lands (phase 6), display the first
  // 12 chars of the Appwrite userId as a placeholder greeting.
  let greetingName = $derived(data.userId ? data.userId.slice(0, 12) : undefined);
</script>

{#if data.userId}
  <AuthenticatedHome {greetingName} projects={data.projects} questionnaires={data.questionnaires} />
  <div class="logout-bar">
    <button type="button" class="logout" onclick={handleLogout}> Log out </button>
  </div>
{:else}
  <AnonymousHome
    signupUrl="/signup"
    researchers={data.researchers}
    onSignupClick={() => (signupOpen = true)}
  />
  <SignupModal open={signupOpen} onClose={() => (signupOpen = false)} onSubmit={handleSignup} />
{/if}

<style>
  .logout-bar {
    display: flex;
    justify-content: center;
    padding: 2rem 1.5rem 3rem;
  }
  .logout {
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
