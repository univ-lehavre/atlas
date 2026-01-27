export const isEmail = (email: string): boolean => {
  const validation = email.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/);
  const condition =
    email.length > 0 && email.length < 255 && validation !== null && validation.length > 0;
  return condition;
};
