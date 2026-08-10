// Git ref names are interpolated into a shell command by changelog.sh, so they
// are validated here before they ever reach the shell. Only characters that are
// legal in a ref name are allowed: no spaces, quotes, semicolons, backticks or
// dollar signs.
export const REF_PATTERN = /^[.A-Za-z0-9_/\-+]*$/

export function isValidRef(ref) {
  return typeof ref === 'string' && ref.length > 0 && REF_PATTERN.test(ref)
}
