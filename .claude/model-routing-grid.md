# Grille de routage des modèles

Politique d'équipe : **quel tier de modèle traite quel type de tâche.** Le
frontmatter `model:` de chaque agent doit refléter cette grille — `grep -rn "^model:"
.claude/agents` prouve que la politique est réelle, pas aspirationnelle.

Ces projets sont des **apps statiques 100 % client-side, publiques** : pas de donnée
régulée ni de secret côté serveur, donc pas d'axe « sensibilité / local-only » ici.
Seule la **charge cognitive** de la tâche pilote le tier.

## Tiers

| Tier   | Modèle   | Pour quoi                                             | Coût relatif |
| ------ | -------- | ----------------------------------------------------- | ------------ |
| Haut   | `opus`   | Raisonnement profond, planification, ambiguïté, archi | élevé        |
| Milieu | `sonnet` | Exécution scopée, revue de code, édits bien définis   | moyen        |
| Bas    | `haiku`  | Triage, labelling, checks de format                   | faible       |

## Mapping tâche → tier → agent

| Tâche     | Tier     | Agent (`.claude/agents/`) |
| --------- | -------- | ------------------------- |
| planifier | `opus`   | `planner.md`              |
| garder    | `opus`   | `conventions-guardian.md` |
| exécuter  | `sonnet` | `executor.md`             |
| relire    | `sonnet` | `reviewer.md`             |
| valider   | `sonnet` | `security-validator.md`   |

Lecture : la **charge cognitive** décide du tier — planification et arbitrage
d'architecture montent en `opus` ; l'exécution, la revue et la validation scopée
restent en `sonnet` (le modèle le moins cher qui fait le travail correctement).
Aucun agent `haiku` pour l'instant : pas de tâche de triage/labelling récurrente
sur ces apps mono-paquet.
