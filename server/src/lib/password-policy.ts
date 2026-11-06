export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters, no more than 72 bytes, and include an uppercase letter, a number, and a special character.";

export function meetsPasswordPolicy(password: string): boolean {
  return (
    password.length >= 8 &&
    Buffer.byteLength(password, "utf8") <= 72 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}
