/**
 * Concatène des classes CSS conditionnelles en ignorant les valeurs falsy.
 * Minuscule helper maison (pas de dépendance type `clsx`) :
 *   cx('base', isActive && 'active', undefined) → 'base active'
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
