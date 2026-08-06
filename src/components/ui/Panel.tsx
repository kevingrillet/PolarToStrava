/**
 * Conteneur « carte » du design system : surface, bordure, rayon et ombre issus
 * des tokens de thème. En-tête optionnel (titre + description + zone d'actions).
 *
 * Le titre est rendu comme un véritable titre (`<h2>` par défaut, niveau ajustable
 * via `titleLevel`) pour préserver la hiérarchie de la page. Étend les attributs
 * natifs de `<section>`.
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/cx';

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  /** Contenu aligné à droite de l'en-tête (boutons, badges…). */
  actions?: ReactNode;
  /** Niveau du titre (2 → `<h2>`, etc.) pour respecter la hiérarchie. Défaut : 2. */
  titleLevel?: 2 | 3 | 4;
}

export function Panel({
  title,
  description,
  actions,
  titleLevel = 2,
  className,
  children,
  ...rest
}: PanelProps) {
  const Heading = `h${titleLevel}` as const;
  const hasHeader = title != null || description != null || actions != null;

  return (
    <section className={cx('rounded-card border bg-surface p-5 shadow-card', className)} {...rest}>
      {hasHeader && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title != null && <Heading className="text-lg font-semibold text-fg">{title}</Heading>}
            {description != null && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
          </div>
          {actions != null && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
