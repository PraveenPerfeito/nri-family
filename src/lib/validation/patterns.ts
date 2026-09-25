/**
 * Validation patterns shared by client forms and server schemas.
 * Kept free of dependencies so importing them never pulls zod into the browser.
 */

/** International phone: optional +, digits, spaces, dashes, dots, brackets. Digit count is checked separately (7–15). */
export const PHONE_PATTERN = /^\+?[0-9\s\-().]{7,22}$/;

/** Same rule for the HTML `pattern` attribute, which browsers compile with the `v` flag (punctuation must be escaped). */
export const PHONE_HTML_PATTERN = String.raw`\+?[0-9\s\(\)\.\-]{7,22}`;
