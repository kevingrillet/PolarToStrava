import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

/**
 * Référence couleur du design system : les **tokens sémantiques** (variables CSS)
 * qui composent l'interface et changent avec les menus « Thème » et « Mode » de la
 * barre d'outils.
 *
 * NB : les classes Tailwind sont écrites en toutes lettres (`bg-danger`, `bg-line`…)
 * pour que le compilateur les génère — un nom de classe construit dynamiquement
 * (`bg-${token}`) ne serait pas détecté.
 */
const meta: Meta = {
  title: 'Design/Couleurs',
};
export default meta;

type Story = StoryObj;

function Swatch({ cls, name, token }: { cls: string; name: string; token: string }) {
  return (
    <div className="text-center">
      <div className={`h-14 w-full rounded-control border ${cls}`} />
      <div className="mt-1 text-xs font-medium text-fg">{name}</div>
      <code className="text-[10px] text-fg-muted">{token}</code>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">{children}</div>
    </section>
  );
}

export const Tokens: Story = {
  render: () => (
    <div className="space-y-6 text-fg">
      <Group title="Surfaces">
        <Swatch cls="bg-canvas" name="Fond de page" token="canvas" />
        <Swatch cls="bg-surface" name="Carte" token="surface" />
        <Swatch cls="bg-input" name="Champ" token="input" />
        <Swatch cls="bg-subtle" name="Atténué" token="subtle" />
        <Swatch cls="bg-line" name="Bordure" token="line" />
      </Group>

      <Group title="Accent">
        <Swatch cls="bg-accent" name="Accent" token="accent" />
        <Swatch cls="bg-accent-hover" name="Accent survol" token="accent-hover" />
        <Swatch cls="bg-accent-fg" name="Texte / accent" token="accent-fg" />
        <Swatch cls="bg-accent-soft" name="Accent doux" token="accent-soft" />
        <Swatch cls="bg-accent-strong" name="Accent fort" token="accent-strong" />
      </Group>

      <Group title="États">
        <Swatch cls="bg-danger" name="Erreur" token="danger" />
        <Swatch cls="bg-warning" name="Avertissement" token="warning" />
      </Group>

      <section className="space-y-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Texte</h2>
        <p className="text-fg">Texte principal (text-fg)</p>
        <p className="text-fg-muted">Texte secondaire (text-fg-muted)</p>
        <p className="text-danger">Message d’erreur (text-danger)</p>
        <p className="text-warning">Avertissement (text-warning)</p>
      </section>
    </div>
  ),
};
