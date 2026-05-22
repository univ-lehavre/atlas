import { mockResearcherPool } from '$lib/mocks/researchers';

import type { PageServerLoad } from './$types';

// Fisher–Yates : reordonne le pool à chaque requête pour qu'aucune
// visite ne voie le même ordre initial. Le composant AnonymousHome
// fait tourner ses tuiles toutes les 5 s pendant que la page est
// ouverte ; le shuffle ici garantit aussi un point de départ différent
// à chaque page load (utile au F5 du visiteur).
const shuffle = <T>(input: readonly T[]): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i];
    const b = arr[j];
    if (a === undefined || b === undefined) continue;
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
};

export const load: PageServerLoad = () => {
  return {
    researchers: shuffle(mockResearcherPool),
  };
};
