/**
 * Badge / pastille du design system : court libellé d'état ou de catégorie.
 *
 * Cinq variantes basées sur les tokens. Les variantes d'état (`success`,
 * `warning`, `danger`) utilisent texte + bordure colorés sur fond transparent :
 * lisibles quel que soit le fond et dans tous les thèmes (les tokens d'état sont
 * garantis ≥ 4.5:1 sur les surfaces). Utile notamment pour les badges de
 * conformité (AA / AAA / échec) de l'outil de palette RGAA.
 */
import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'border-line bg-subtle text-fg',
  accent: 'border-transparent bg-accent-soft text-accent-strong',
  success: 'border-success text-success',
  warning: 'border-warning text-warning',
  danger: 'border-danger text-danger',
};

export function Badge({ variant = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-xs font-medium',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
