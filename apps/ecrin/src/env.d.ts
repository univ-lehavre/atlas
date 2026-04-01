import type { AvailableLanguageTag } from '$lib/paraglide/runtime';

declare global {
  namespace App {
    interface Locals {
      userId: string | undefined;
      lang: AvailableLanguageTag | undefined;
    }
  }
}

export {};
