// Stub for `$app/forms`. The components use `enhance` for progressive
// enhancement of form submissions ; Storybook never actually submits, so
// a no-op is enough for visual review.
export const enhance = (
  _form: HTMLFormElement,
  _submit?: unknown,
): { destroy(): void } => ({
  destroy: (): void => {
    /* no-op */
  },
});
export const applyAction = async (): Promise<void> => {
  /* no-op */
};
export const deserialize = <T>(result: string): T => JSON.parse(result) as T;
