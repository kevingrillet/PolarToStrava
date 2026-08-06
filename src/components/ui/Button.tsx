/**
 * Bouton du design system.
 *
 * Quatre variantes (`primary`, `secondary`, `ghost`, `danger`) et deux tailles.
 * Toutes les couleurs proviennent des tokens de thème, donc le bouton reste
 * lisible dans les 8 combinaisons identité × clair/sombre. Le focus clavier est
 * géré globalement (`:focus-visible` dans `index.css`). Étend les attributs
 * natifs de `<button>` (dont `type`, `disabled`, `onClick`, `aria-*`).
 */
import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg shadow-btn hover:bg-accent-hover',
  secondary: 'border bg-surface text-fg hover:bg-subtle',
  ghost: 'text-fg hover:bg-subtle',
  // Variante destructive en « outline » : texte + bordure `danger`, lisibles dans
  // tous les thèmes (un aplat rouge plein passerait sous le seuil de contraste en
  // mode sombre, où le token danger est volontairement clair).
  danger: 'border border-danger bg-surface text-danger hover:bg-subtle',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cx(BASE, VARIANTS[variant], SIZES[size], className)} {...rest} />
  );
}
