# Coding standards

Conventions **transverses** aux projets Node de ce workspace. Complète l'`AGENTS.md`
du dépôt (qui fait foi en cas de conflit). Volontairement court : ci-dessous des
**rappels de règles** ; le détail (listes exhaustives, exemples) vit dans l'`AGENTS.md`.

## Avant de conclure

- `npm run format` puis `npm run check` (format + lint + typecheck + test) → **tout vert**.
- Les hooks git l'imposent : `pre-commit` = `npm run check` ; `pre-push` = `test:e2e` + `build-storybook`.

## TypeScript

- Mode strict, `noUnusedLocals` / `noUnusedParameters`. Pas de `any` implicite.
- Typer les API publiques ; laisser l'inférence faire le reste en local.

## Thèmes (règle absolue)

- **Toujours les tokens de thème** (`bg-canvas`, `text-fg`, `bg-accent`…), **jamais** de
  couleur Tailwind en dur (`text-red-500`…) : ça casse une des 8 combinaisons
  (4 identités × clair/sombre).
- Liste complète des tokens : `AGENTS.md § Thèmes` ; valeurs définies dans `src/index.css`.

## i18n

- Maison, sans dépendance : `t('a.b.c')`. L'interface `Messages` est typée → toute
  clé doit exister en **fr ET en** (sinon erreur TS).

## Logique métier

- Fonctions **pures** et **testées**, séparées de React (`lib/`, `application/`…).
- Composants = présentation + état UI ; pas de logique métier éparpillée.
- Dépendances runtime **minimales** ; toute lib tierce isolée dans un adaptateur.

## Accessibilité

- Navigation clavier, focus visible (`:focus-visible` global), ARIA pertinent,
  un seul `<h1>` par page.

## Tests

- Unitaires/composants : **Vitest + Testing Library**. E2e : **Playwright** (`tests/`).
- **Storybook est la source de vérité** d'un composant partagé (story + test avant usage).

## Git / commits

- **Conventional Commits** : `type(scope)!: description` — types : `feat`, `fix`,
  `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Ne pas contourner les hooks (`--no-verify`) sans raison explicite et signalée.
- Fins de ligne **LF** (imposées par `.gitattributes`).
