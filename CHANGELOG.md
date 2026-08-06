# Changelog

Toutes les modifications notables de ce projet sont consignées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Corrigé

- **Le plafond journalier de la page d'upload est enfin chiffré : 30 séances par
  jour**, soit deux lots de 15. Il n'était jusqu'ici mentionné que comme « plafond
  journalier non documenté », et le README en tirait une estimation fausse — « une
  quinzaine de minutes » pour 700 séances, qui ne comptait que le temps de
  glisser-déposer alors qu'il faut une **vingtaine de jours** (700 ÷ 30 ≈ 24). La
  valeur vient d'une mesure : Strava ne la publie pas et ne renvoie aucun en-tête
  exploitable sur cette page, le plafond reste donc **documenté et non modélisé**
  (README, `AGENTS.md`, `core/export/batches.ts`, note `LISEZ-MOI.txt` déposée à
  côté des lots, et aide de l'interface FR/EN).
- Corollaire consigné dans le README : à volume égal la voie API est bien plus
  rapide (plusieurs centaines de séances par jour contre 30), ce qui départage les
  deux voies sur le prix de l'abonnement, pas sur le débit.

## [0.2.1] — 2026-08-05

### Corrigé

- **Les lots pouvaient dépasser la taille limite.** Le dossier de destination
  n'était pas nettoyé : deux exports successifs se superposaient, laissant les
  fichiers de la sélection précédente en place. Un dossier `lot-01` se retrouvait
  ainsi à 16 fichiers — donc **refusé en bloc par Strava**, qui n'en accepte que
  15 — et l'on risquait d'envoyer des séances exclues depuis. L'export purge
  désormais le précédent, de façon **chirurgicale** : seuls les dossiers répondant
  exactement à `lot-<chiffres>` et notre propre note sont effacés, jamais le reste
  du dossier, qui appartient à l'utilisateur. Couvert par
  `server/fileExport.test.ts`, qui vérifie aussi qu'un fichier étranger survit.
- Le champ de fichier masqué de la zone de dépôt n'avait pas de nom accessible
  (violation axe `label`, impact critique). Il est nommé et retiré du parcours de
  tabulation, le bouton visible étant le vrai contrôle.
- **Le bouton « Analyser » était 20 px trop bas.** Le texte d'aide vivant à
  l'intérieur du champ, `items-end` alignait le bouton sur le bas de cette aide et
  non sur celui du champ. L'aide est passée sous la rangée, son lien
  `aria-describedby` étant conservé. Un test Playwright mesure désormais les boîtes
  englobantes et garde l'invariant (`tests/layout.spec.ts`).
- Le gabarit du champ de chemin affichait des doubles antislashs : un attribut JSX
  est une chaîne littérale, `\\` n'y est pas un échappement.

### Ajouté

- **Dépôt et sélection de l'archive** à l'étape 2. Un navigateur ne divulguant
  jamais le chemin réel d'un fichier (`C:\fakepath\…`), l'archive est recopiée
  vers le backend — 49 Mo en ~200 ms sur localhost, traitement en flux pour ne pas
  la mettre en tampon — et c'est le chemin renvoyé par le serveur qui alimente
  l'analyse, lancée automatiquement. La saisie manuelle du chemin reste le seul
  moyen de désigner un **dossier** déjà décompressé.
- **La procédure d'obtention de l'archive** auprès de Polar, dépliable à l'étape 2.
- **L'étape 1 est signalée comme optionnelle** quand la voie « fichiers » est
  retenue : sans cette précision, on croit devoir s'abonner pour commencer.

## [0.2.0] — 2026-08-05

Ajout d'une voie d'envoi **sans abonnement Strava**, et passage au format FIT.

### Contexte

Depuis le 1ᵉʳ juin 2026, l'accès à l'API Strava en tier Standard exige un
abonnement Strava actif. L'import manuel de fichiers, lui, reste gratuit : l'outil
propose désormais les deux voies, qui partagent tout `core/`.

### Ajouté

- **Encodage FIT** (`core/fit/`), via le SDK officiel `@garmin/fitsdk`. C'est
  devenu le format par défaut, pour deux raisons : il porte un couple
  `sport` / `sub_sport` que Strava lit — indispensable sans API, où l'on ne peut
  plus corriger le type après coup — et il est ~29× plus compact que le TCX
  (522 Ko contre 15 Mo pour une sortie de 6 h 45). Les tests relisent les fichiers
  produits avec le décodeur officiel plutôt que de comparer des octets.
- **Table sport Strava → FIT** (`core/fit/sports.ts`), exhaustive à la compilation
  (`Record` sur l'union `StravaSportType`), avec affinage du sous-sport pour les
  machines fixes (tapis, home-trainer). Valeurs interrogées dans le profil du SDK,
  jamais écrites de mémoire : `squash` est un sous-sport (94) du sport `racket`
  (64), pas un sport de premier niveau.
- **Export en lots** (`core/export/batches.ts`, `server/fileExport.ts`) : écriture
  dans des sous-dossiers `lot-01`, `lot-02`… de 15 fichiers (limite de la page
  d'upload sans abonnement, 25 avec), noms de fichiers datés et triables, et une
  note `LISEZ-MOI.txt` déposée à côté — au moment d'envoyer, on est dans le
  navigateur et plus dans l'application.
- **Choix de la voie d'envoi** à l'étape 4 de l'interface, « fichiers » par défaut.

### Modifié

- L'envoi par API utilise désormais le FIT, ce qui rend la requête de correction
  du sport (`PUT /activities/{id}`) inutile : **une requête de moins par séance**
  sur un quota qui est la ressource rare. L'option reste disponible en
  échappatoire.
- `npm run verify` produit et **relit** un FIT en plus du TCX, et choisit ses
  échantillons pour couvrir les chemins qui diffèrent réellement (avec GPS, sans
  GPS, sans donnée) — la version précédente pouvait ne tester que des séances de
  salle et donc jamais le GPS.

## [0.1.0] — 2026-08-05

Version initiale. Dérivée de `NodeTemplate` (React 19 + TypeScript + Vite,
thèmes runtime, i18n FR/EN, Vitest, ESLint/Prettier), à laquelle s'ajoute un
backend et la logique métier.

### Ajouté

- **Lecture de l'export Polar Flow** (`core/polar/`) : parsing tolérant aux
  littéraux `NaN` que Polar émet — le fichier n'est pas du JSON valide et
  `JSON.parse` échoue sur la quasi-totalité d'un corpus réel ; recomposition des
  dates locales naïves avec `timezoneOffsetMinutes` ; fusion des canaux
  d'échantillons et de la trace GPS en une piste 1 Hz, malgré des bases de temps
  distinctes ; exclusion des points d'altitude non calée en début de séance.
  Format documenté dans `docs/polar-export.md`.
- **Dictionnaire des sports Polar** (`core/polar/sports.ts`) : l'export ne donne
  que des `sport.id` numériques et aucun de ses fichiers ne les résout. Le
  dictionnaire couvre ~160 sports et la correspondance vers les `sport_type`
  Strava, avec réaffectation manuelle possible pour les ids historiques.
- **Génération TCX** (`core/tcx/build.ts`), sans dépendance et sans passer par un
  convertisseur web tiers : ordre des éléments conforme au schéma Garmin,
  échappement XML, vitesse convertie de km/h en m/s, découpage par tours.
- **Sélection des séances** (`core/filter.ts`) : bornes de dates sur l'heure
  locale, durée et distance minimales, filtre par sport, exclusion des séances
  sans donnée exploitable. Chaque exclusion porte un motif affichable.
- **Backend Fastify** (`server/`) : OAuth2 Strava (le `client_secret` ne quitte
  pas le serveur), lecture du ZIP par lots avec cache de scan, file d'envoi
  séquentielle et interruptible, flux de progression en SSE.
- **Respect des quotas Strava** : lecture des en-têtes `X-RateLimit-*`, attente
  calée sur les bornes réelles (tranches de 15 min alignées sur l'horloge, minuit
  UTC pour le quota journalier), reprise sur 429, journal d'envois écrit avant de
  passer à la séance suivante — un import complet dépasse forcément le quota
  journalier et doit survivre à un arrêt.
- **Envoi en `tcx.gz`** : une sortie de 6 h produit un TCX de ~15 Mo, ramené à
  ~416 Ko compressé.
- **Interface** (`src/`) : assistant en quatre étapes, table de correspondance des
  sports éditable, aperçu de la sélection, progression en direct avec compte à
  rebours de quota. FR/EN, thèmes clair/sombre.
- **`npm run verify`** : diagnostic d'un export sans rien envoyer — répartition
  par sport, exploitabilité, TCX d'exemple.

### Retiré (par rapport au template)

- PWA (manifeste + service worker) : sur un outil lancé en local, un cache
  hors-ligne resservirait une interface périmée.
- Déploiement GitHub Pages et Lighthouse : le projet n'est pas une application
  statique, il a besoin de son backend.
