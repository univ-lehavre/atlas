<script lang="ts">
  import AnonymousHome from '@univ-lehavre/atlas-ui/AnonymousHome.svelte';
  import SignupModal from '@univ-lehavre/atlas-ui/SignupModal.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let signupOpen = $state(false);

  // Stub : le wiring Appwrite arrive en phase 4. Pour l'instant, on
  // simule un envoi reussi (500 ms d'attente, log de l'email, fermeture).
  async function handleSignup(email: string): Promise<void> {
    console.log('[stub] signup requested for', email);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
</script>

<AnonymousHome
  signupUrl="/signup"
  researchers={data.researchers}
  onSignupClick={() => (signupOpen = true)}
/>

<SignupModal bind:open={signupOpen} onSubmit={handleSignup} />
