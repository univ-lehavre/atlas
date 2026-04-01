import { writable } from 'svelte/store';

export type CardLayout = 'vertical' | 'horizontal';

export const cardLayout = writable<CardLayout>('vertical');
