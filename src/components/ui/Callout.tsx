/**
 * Notice d'état du design system : un court message contextuel (validation,
 * avertissement, information). Deux présentations :
 *  - en ligne (défaut) : texte coloré selon le ton, précédé d'un `Badge` optionnel ;
 *  - bloc (`block`) : encadré pointillé discret, pour un état vide / un repli.
 *
 * Accessibilité : `role` vaut `alert` pour le ton `danger` (annonce assertive d'une
 * erreur) et `status` sinon — surchargeable via la prop. Découplé de l'i18n : le
 * texte est passé en enfant.
 */
import type { ReactNode } from 'react';
import { Badge, type BadgeVariant } from './Badge';
import { cx } from '../../lib/cx';

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger';

const TEXT_CLASS: Record<CalloutTone, string> = {
  info: 'text-fg-muted',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

const BADGE_VARIANT: Record<CalloutTone, BadgeVariant> = {
  info: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

export interface CalloutProps {
  tone?: CalloutTone;
  /** Libellé d'un badge de tête optionnel (ton hérité). */
  badge?: string;
  /** Présentation « bloc » (encadré pointillé) plutôt qu'en ligne. */
  block?: boolean;
  /** Rôle ARIA ; par défaut `alert` pour `danger`, `status` sinon. */
  role?: 'status' | 'alert';
  children: ReactNode;
}

export function Callout({ tone = 'info', badge, block = false, role, children }: CalloutProps) {
  const resolvedRole = role ?? (tone === 'danger' ? 'alert' : 'status');

  if (block) {
    return (
      <p
        role={resolvedRole}
        className="rounded-card border border-dashed bg-surface p-6 text-sm text-fg-muted"
      >
        {children}
      </p>
    );
  }

  return (
    <p role={resolvedRole} className={cx('text-sm', TEXT_CLASS[tone])}>
      {badge ? <Badge variant={BADGE_VARIANT[tone]}>{badge}</Badge> : null}
      {badge ? ' ' : null}
      {children}
    </p>
  );
}
