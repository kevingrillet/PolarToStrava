/**
 * Accordéon accessible (motif WAI-ARIA « Disclosure ») piloté par les données.
 *
 * Chaque en-tête est un `<button>` (donc actionnable clavier nativement) portant
 * `aria-expanded` et `aria-controls` ; le panneau associé a `role="region"`,
 * `aria-labelledby` vers son bouton, et `hidden` quand il est replié. Par défaut
 * un seul panneau ouvert à la fois (`allowMultiple` pour en autoriser plusieurs).
 */
import { useId, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx';

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Autorise plusieurs panneaux ouverts simultanément. Défaut : false. */
  allowMultiple?: boolean;
}

export function Accordion({ items, allowMultiple = false }: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(items.filter((item) => item.defaultOpen).map((item) => item.id)),
  );

  function toggle(id: string) {
    setOpen((prev) => {
      const isOpen = prev.has(id);
      if (allowMultiple) {
        const next = new Set(prev);
        if (isOpen) next.delete(id);
        else next.add(id);
        return next;
      }
      return isOpen ? new Set() : new Set([id]);
    });
  }

  return (
    <div className="divide-y overflow-hidden rounded-card border bg-surface">
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const buttonId = `${baseId}-${item.id}-btn`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id}>
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-fg transition hover:bg-subtle"
              >
                <span>{item.title}</span>
                <span
                  aria-hidden="true"
                  className={cx('transition-transform', isOpen && 'rotate-90')}
                >
                  ▸
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-4 py-3 text-sm text-fg-muted"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
