# Architecture

Site web **statique** (GitHub Pages), **100% client-side**. Complète l'`AGENTS.md`
du dépôt (qui fait foi). Volontairement court.

Stack, thèmes, i18n, dépendances minimales et déploiement : voir `AGENTS.md` (détail) et
`coding-standards.md` (règles transverses). Versions exactes : `package.json`.

## Ce dépôt : NodeTemplate (socle)

**Template** d'infrastructure sans logique métier : on part de là pour un vrai projet
en remplaçant la page de démo (`src/App.tsx`). C'est le socle dont dérivent DevToolbox,
QrCodeGenerator et 3DExperiment.

```
src/
├─ components/ui/   Design system (Button, Input, Select, Badge, Panel, Accordion, CopyButton…) + stories + tests
├─ components/      ThemeToggle, ThemeSelector, LanguageSwitcher
├─ hooks/           useTheme, useDebouncedValue, useCachedState
├─ i18n/            I18nProvider + messages (FR/EN)
├─ lib/             cx (classes), readTextFile
├─ App.tsx          page de démo — À REMPLACER
├─ theme.ts         déclaration des thèmes
└─ index.css        tokens des thèmes (variables CSS)
tests/              specs Playwright
```
