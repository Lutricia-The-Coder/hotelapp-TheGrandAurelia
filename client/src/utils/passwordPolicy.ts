export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters, and include an uppercase letter, a number, and a special character.";

export function meetsPasswordPolicy(password: string): boolean {
  return (
    password.length >= 8 &&
    new TextEncoder().encode(password).length <= 72 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}
