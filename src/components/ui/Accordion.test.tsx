import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion, type AccordionItem } from './Accordion';

const items: AccordionItem[] = [
  { id: 'a', title: 'Section A', content: 'Contenu A' },
  { id: 'b', title: 'Section B', content: 'Contenu B' },
];

describe('Accordion', () => {
  it('replie tout par défaut (aria-expanded=false, panneaux masqués)', () => {
    render(<Accordion items={items} />);
    expect(screen.getByRole('button', { name: 'Section A' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    // `hidden` ⇒ exclu de l'arbre d'accessibilité.
    expect(screen.queryByText('Contenu A')).not.toBeVisible();
  });

  it('déplie au clic', async () => {
    render(<Accordion items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'Section A' }));
    expect(screen.getByRole('button', { name: 'Section A' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Contenu A')).toBeVisible();
  });

  it('en mode simple, ouvrir une section referme la précédente', async () => {
    render(<Accordion items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'Section A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Section B' }));
    expect(screen.getByRole('button', { name: 'Section A' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Section B' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('respecte defaultOpen', () => {
    render(<Accordion items={[{ ...items[0], defaultOpen: true }]} />);
    expect(screen.getByText('Contenu A')).toBeVisible();
  });

  it('en mode multiple, garde plusieurs sections ouvertes', async () => {
    render(<Accordion items={items} allowMultiple />);
    await userEvent.click(screen.getByRole('button', { name: 'Section A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Section B' }));
    expect(screen.getByText('Contenu A')).toBeVisible();
    expect(screen.getByText('Contenu B')).toBeVisible();
  });
});
