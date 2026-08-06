# AGENTS.md — PolarToStrava

Guide pour agents IA (et humains). Outil **local** d'import de l'historique Polar
Flow vers Strava : lecture de l'archive d'export, conversion des séances en TCX,
envoi via l'API Strava en respectant ses quotas.

Pour ce qui est transverse au dossier `Node/` (scripts `free.sh`/`zip.sh`/`kill.sh`,
identité Git), voir `../AGENTS.md`.

## Ce que fait l'outil, et pourquoi

La synchronisation Polar ↔ Strava ne reprend **pas** l'historique antérieur à son
activation. L'outil comble ce trou en quatre étapes : connexion Strava → lecture
de l'export → sélection des séances → envoi.

### Deux voies d'envoi, et pourquoi

Depuis le 1ᵉʳ juin 2026, l'accès API en tier Standard **exige un abonnement
Strava** ; l'import manuel de fichiers reste gratuit. L'outil propose donc :

- **`files`** (défaut) — écrit les séances dans des sous-dossiers de 15 fichiers
  (la limite de la page d'upload sans abonnement, 25 avec), à glisser sur
  <https://www.strava.com/upload/select>. La page plafonne en plus à **30 séances
  par jour, soit deux lots de 15** (mesuré, non documenté par Strava) ;
- **`api`** — envoi automatique, avec suivi des quotas et reprise.

Les deux partagent tout `core/` : seule la dernière étape diffère. C'est la raison
pour laquelle la logique métier ne connaît ni l'API ni le disque.

Il s'inspire de <https://dannas.name/2023/08/15/import-polar-trainingdata-to-strava>
mais s'en écarte sur trois points :

1. **La conversion est faite ici**, sans passer par un convertisseur web tiers :
   les données d'entraînement sont personnelles et n'ont pas à sortir de la machine.
2. **Le filtrage ne détruit rien.** Le billet supprimait des fichiers à coups de
   `ls | awk | xargs rm` ; l'archive n'est jamais modifiée, et le filtre est un
   objet de configuration réversible.
3. **Les envois sont reprenables.** Les quotas Strava rendent un import complet
   impossible en une session (voir plus bas) : la progression est journalisée.

## ⚠ Divergence assumée avec le reste du dossier `Node/`

Les autres projets sont des applications **statiques** déployables sur GitHub
Pages. Celui-ci a un **backend Fastify** (`server/`), pour trois raisons
rédhibitoires côté navigateur :

- l'échange du code OAuth Strava contre un jeton exige le `client_secret` ;
- l'API Strava n'autorise pas l'upload depuis une origine web (CORS) ;
- lire une archive de 50 Mo et écrire un journal de reprise demande le disque.

Conséquences : pas de `deploy.yml`, pas de Lighthouse, **pas de PWA** (un service
worker resservirait une interface périmée sur un outil lancé en local), et
`vite.config.ts` relaie `/api` vers le backend au lieu d'utiliser `base: './'`.

## Commandes

| Commande                     | Effet                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`                | Backend (8787) + interface (5173), en parallèle.                                        |
| `npm run verify -- <chemin>` | Analyse un export sans rien envoyer, et génère des TCX d'exemple dans `.data/samples/`. |
| `npm run check`              | **À lancer avant de conclure** : format + lint + typecheck + test.                      |
| `npm run test`               | Vitest. `test:e2e` pour Playwright.                                                     |
| `npm run storybook`          | Storybook (port 6006).                                                                  |

Après une modif : `npm run format` puis `npm run check`. Tout doit être vert.

## Configuration

Copier `.env.example` vers `.env` et renseigner `STRAVA_CLIENT_ID` /
`STRAVA_CLIENT_SECRET` (obtenus sur <https://www.strava.com/settings/api>).

> Dans les réglages de l'application Strava, **« Authorization Callback Domain »
> doit valoir exactement `localhost`** — le domaine seul, ni protocole, ni port,
> et surtout pas `127.0.0.1`.

`.data/` (jeton, journal de reprise, cache de scan, TCX d'exemple) est **ignoré
par git** : il contient un jeton d'accès et des données de santé.

## Structure

```
core/                  logique métier, sans dépendance à la plateforme
├─ dto.ts              contrat d'échange front ↔ back (source unique)
├─ filter.ts           sélection des séances + motif d'exclusion
├─ polar/
│  ├─ json.ts          parsing tolérant (littéraux `NaN` — voir docs/)
│  ├─ session.ts       normalisation → piste 1 Hz fusionnant canaux et GPS
│  ├─ sports.ts        dictionnaire des sports Polar → type Strava
│  └─ fixtures.ts      jeux d'essai reproduisant un export réel
├─ fit/                **format par défaut** — porte le sport
│  ├─ build.ts         encodage via le SDK officiel Garmin
│  └─ sports.ts        type Strava → sport / sub_sport FIT
├─ tcx/build.ts        repli lisible (ordre des éléments imposé par le schéma)
└─ export/batches.ts   découpage en lots + nommage des fichiers
server/                backend Fastify
├─ config.ts           environnement · store.ts  persistance `.data/`
├─ polarExport.ts      lecture du ZIP par lots + cache de scan
├─ fileExport.ts       écriture des lots sur disque (voie sans abonnement)
├─ strava.ts           OAuth2, envoi, suivi des quotas
├─ queue.ts            file séquentielle, interruptible, journalisée
└─ index.ts            routes + flux SSE de progression
src/                   interface React (assistant en 4 étapes)
scripts/verify.ts      diagnostic d'un export
docs/polar-export.md   **rétro-ingénierie du format Polar** — à lire avant de toucher à `core/polar/`
```

`core/` est inclus par `tsconfig.app.json` **et** `tsconfig.server.json` : c'est du
TypeScript neutre, partagé par les deux côtés, vérifié deux fois plutôt que de
gérer des références de projet.

## Ce qu'il faut savoir avant de modifier

### Le format Polar est piégeux

Quatre pièges, tous documentés et testés dans **`docs/polar-export.md`** : `NaN`
nus (le JSON n'est pas valide), dates locales sans fuseau, échantillons sans
horodatage avec un GPS sur une autre base de temps, et un altimètre qui renvoie 0
avant de se caler. Ne pas modifier `core/polar/` sans avoir lu ce fichier.

### Les quotas Strava dictent l'architecture de la voie API

200 requêtes / 15 min et 2 000 / jour. Une séance coûte 2 à 3 requêtes (1 envoi,
1 à 2 sondages d'état ; la correction de sport n'est plus nécessaire depuis le
passage au FIT). Un historique de 700 séances dépasse donc le quota journalier :
**l'import s'étale sur plusieurs jours**, et c'est normal.

D'où : lecture des en-têtes `X-RateLimit-*` à chaque réponse, attente calée sur
les bornes réelles (tranches de 15 min alignées sur l'horloge, minuit UTC pour le
quota journalier), journal de reprise écrit **avant** de passer à la séance
suivante, et un import à la fois.

La **voie fichiers** a son propre plafond, bien plus bas : **30 séances par jour**
(deux lots de 15), mesuré à l'usage — Strava ne le documente pas et ne renvoie
aucun en-tête exploitable, la page se contentant de refuser les envois suivants.
Ce plafond n'est donc **pas** modélisé dans le code : il est documenté au bon
endroit (README, `LISEZ-MOI.txt` déposé à côté des lots, aide de l'interface) et le
découpage en lots de 15 suffit à le rendre praticable — deux dossiers par jour.
Conséquence à garder en tête : un historique de 700 séances prend ~24 jours par
fichiers contre quelques jours par API.

### Le format par défaut est le FIT, et ce n'est pas un détail

Le TCX n'exprime que trois sports (`Running`, `Biking`, `Other`). Par l'API on
pouvait corriger après coup (`PUT /activities/{id}`) ; par la voie fichiers, non —
il faudrait reprendre chaque activité à la main dans Strava.

Le FIT porte un couple `sport` / `sub_sport` que Strava lit, et il est ~29× plus
compact (522 Ko contre 15 Mo pour une sortie de 6 h 45).

L'encodage passe par **`@garmin/fitsdk`**, le SDK officiel : format binaire à
définitions de messages et CRC, dont les enums changent à chaque version du profil.
Trois particularités de son contrat, découvertes par aller-retour encodage →
décodage et vérifiées par les tests :

- les champs `dateTime` prennent un `Date`, mais `localDateTime` attend un
  **nombre** de secondes depuis l'époque FIT (1989-12-31) ;
- les positions se donnent en **semicircles** (degrés × 2³¹/180), pas en degrés ;
- `writeMesg` est typé `Encodable<Mesg>` : passer un littéral déclenche le contrôle
  d'excédent de propriétés. Il faut construire le message dans une variable typée
  (`Encodable<RecordMesg>`…), ce qui vérifie en plus réellement les champs.

**Les tests de `core/fit/` relisent les fichiers produits avec le décodeur
officiel** plutôt que de comparer des octets : c'est la seule vérification qui ait
du sens sur un binaire, et c'est elle qui a attrapé les deux premiers points
ci-dessus.

Ne jamais écrire une valeur d'enum de sport de mémoire : les interroger via
`Profile.types.sport` / `Profile.types.subSport`. `squash`, par exemple, n'est pas
un sport mais un **sous**-sport (94) du sport `racket` (64).

### Thèmes — règle absolue (héritée du template)

Deux axes indépendants : identité (`default`/`atelier`/`blueprint`/`aurora`, via
`data-theme`) et clair/sombre (classe `dark`). 8 combinaisons valides.
**Toujours passer par les tokens** (`bg-canvas`, `bg-surface`, `text-fg`,
`text-fg-muted`, `bg-accent`, `accent-strong`, `text-danger`, `rounded-card`…) ;
**jamais de couleur Tailwind en dur** (`text-red-500`), qui casserait dans l'une
des 8 combinaisons.

### i18n

Maison, sans dépendance. `t('a.b.c')`. L'interface `Messages` force `fr` **et**
`en` à avoir la même structure : une clé manquante est une erreur de compilation.

## Tests

188 tests. Le cœur (`core/`) est couvert contre des jeux d'essai qui reproduisent
la forme d'un export réel — valeurs synthétiques, car un vrai fichier contient
date de naissance, poids et FC de repos, qui n'ont pas leur place dans un dépôt.

Validation de bout en bout sur un export réel : `npm run verify -- <chemin>`.
