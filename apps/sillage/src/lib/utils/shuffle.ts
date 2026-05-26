// Fisher–Yates shuffle. Non-destructive : returns a new array with the
// same elements in a uniformly random permutation. The optional `rng`
// parameter lets tests pin the randomness ; defaults to Math.random.
export const shuffle = <T>(input: readonly T[], rng: () => number = Math.random): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = arr[i];
    const b = arr[j];
    if (a === undefined || b === undefined) continue;
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
};
