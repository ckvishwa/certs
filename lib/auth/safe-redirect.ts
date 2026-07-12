/**
 * Returns `target` only if it is a safe, same-origin, root-relative path;
 * otherwise returns `fallback`. Prevents open-redirect attacks via absolute
 * URLs (`https://evil.com`), protocol-relative URLs (`//evil.com`), and
 * backslash / control-character tricks that some browsers normalise to `//`.
 */
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

export function safeInternalPath(
  target: string | null | undefined,
  fallback: string,
): string {
  if (typeof target !== "string") return fallback;

  const value = target.trim();
  if (value.length === 0) return fallback;

  // Must be root-relative.
  if (!value.startsWith("/")) return fallback;

  // Reject protocol-relative forms.
  if (value.startsWith("//")) return fallback;

  // Reject any backslash — browsers may normalise "\" to "/".
  if (value.includes("\\")) return fallback;

  // Reject control characters (newlines/tabs/etc.) to prevent injection tricks.
  if (CONTROL_CHARS.test(value)) return fallback;

  return value;
}
