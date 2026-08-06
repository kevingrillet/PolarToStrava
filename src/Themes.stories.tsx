import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Vue d'ensemble des thèmes.
 *
 * Cette page n'est pas liée à un composant : elle affiche un échantillon
 * représentatif (fond, surfaces, accent, bordures, ombres, police) pour comparer
 * les identités. Utilisez les menus **Thème** (Défaut / Atelier / Blueprint /
 * Aurora) et **Mode** (Clair / Sombre) de la barre d'outils en haut : ils pilotent
 * `data-theme` et la classe `dark` exactement comme l'application.
 */
const meta: Meta = {
  title: 'Design/Thèmes',
};
export default meta;

type Story = StoryObj;

function Showcase() {
  return (
    <div className="space-y-4 text-fg">
      <div>
        <h1 className="text-2xl font-bold">Node Template</h1>
        <p className="text-sm text-fg-muted">
          Échantillon de tokens — change avec les menus « Thème » et « Mode ».
        </p>
      </div>

      {/* Onglets (accent vs subtle) */}
      <div className="flex flex-wrap gap-2">
        <button className="min-w-20 rounded-control border bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg shadow-btn">
          Actif
        </button>
        <button className="min-w-20 rounded-control border bg-subtle px-3 py-1.5 text-sm font-medium text-fg-muted">
          Inactif
        </button>
      </div>

      {/* Carte de section */}
      <section className="rounded-card border bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong">
            1
          </span>
          <span className="text-sm font-semibold">Carte de surface</span>
        </div>
        <p className="mb-3 text-sm text-fg-muted">
          Texte secondaire (fg-muted) sur une surface, avec bordure et ombre du thème.
        </p>
        <input
          className="w-full rounded-control border bg-input px-3 py-2 text-sm text-fg"
          defaultValue="Champ de saisie (bg-input)"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-control bg-accent px-4 py-2 text-sm font-medium text-accent-fg shadow-btn">
            Bouton principal
          </button>
          <button className="rounded-control border border-accent-strong px-4 py-2 text-sm font-medium text-accent-strong">
            Bouton secondaire
          </button>
        </div>
        <p className="mt-3 text-sm">
          <span className="text-danger">Message d’erreur</span>
          <span className="text-fg-muted"> · </span>
          <span className="text-warning">Avertissement</span>
        </p>
      </section>

      {/* Pastilles de couleurs (tokens) */}
      <div className="flex flex-wrap gap-2">
        {[
          ['canvas', 'bg-canvas'],
          ['surface', 'bg-surface'],
          ['subtle', 'bg-subtle'],
          ['input', 'bg-input'],
          ['accent', 'bg-accent'],
          ['accent-soft', 'bg-accent-soft'],
          ['danger', 'bg-danger'],
          ['warning', 'bg-warning'],
        ].map(([name, cls]) => (
          <div key={name} className="text-center">
            <div className={`h-12 w-12 rounded-control border ${cls}`} />
            <span className="text-[10px] text-fg-muted">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const Aperçu: Story = {
  render: () => <Showcase />,
};
