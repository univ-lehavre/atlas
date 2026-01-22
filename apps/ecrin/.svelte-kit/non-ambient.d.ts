// this file is generated — do not edit it

declare module 'svelte/elements' {
  export interface HTMLAttributes<T> {
    'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
    'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
    'data-sveltekit-preload-code'?:
      | true
      | ''
      | 'eager'
      | 'viewport'
      | 'hover'
      | 'tap'
      | 'off'
      | undefined
      | null;
    'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
    'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
    'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
  }
}

declare module '$app/types' {
  export interface AppTypes {
    RouteId(): '/' | '/about' | '/dashboard' | '/records' | '/users';
    RouteParams(): {};
    LayoutParams(): {
      '/': Record<string, never>;
      '/about': Record<string, never>;
      '/dashboard': Record<string, never>;
      '/records': Record<string, never>;
      '/users': Record<string, never>;
    };
    Pathname():
      | '/'
      | '/about'
      | '/about/'
      | '/dashboard'
      | '/dashboard/'
      | '/records'
      | '/records/'
      | '/users'
      | '/users/';
    ResolvedPathname(): `${'' | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
    Asset(): string & {};
  }
}
