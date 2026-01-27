// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  /** App version from package.json, injected by Vite */
  const __APP_VERSION__: string;
  namespace App {
    // interface Error {}
    interface Locals {
      userId?: string;
      /** User email address */
      userEmail?: string;
      /** Connectivity error type, if any */
      connectivityError?: 'appwrite_unavailable' | 'no_internet';
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
