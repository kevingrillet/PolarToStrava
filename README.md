# Polar → Strava

Importer dans Strava l'historique d'entraînement que la synchronisation
Polar ↔ Strava ne reprend pas.

Quand on relie un compte Polar Flow à Strava, seules les séances **postérieures**
à ce branchement sont synchronisées. Tout ce qui précède reste dans Polar. Cet
outil comble ce trou : il lit l'archive d'export de Polar Flow, convertit les
séances au format FIT et les envoie — par fichiers ou par l'API.

Tout tourne **en local** : les données d'entraînement ne passent par aucun service
tiers, et le secret de l'application Strava ne quitte pas la machine.

## Deux voies d'envoi

Depuis le 1ᵉʳ juin 2026, l'accès à l'API Strava en tier Standard **exige un
abonnement Strava** (≈ 12 $/mois). L'import manuel de fichiers, lui, reste
gratuit. L'outil propose donc les deux :

|            | **Fichiers** (défaut)         | **API Strava**                      |
| ---------- | ----------------------------- | ----------------------------------- |
| Abonnement | non                           | **oui**                             |
| Envoi      | glisser-déposer, lot par lot  | automatique                         |
| Rythme     | 15 par lot, 30 séances / jour | 200 requêtes / 15 min, 2 000 / jour |
| Reprise    | manuelle, dossier par dossier | automatique, journalisée            |

Dans les deux cas les fichiers produits sont identiques, et le sport est correct :
c'est le format **FIT** qui s'en charge (voir plus bas).

## Aperçu

Un assistant en quatre étapes :

1. **Connexion Strava** — seulement pour la voie API.
2. **Export Polar** — indiquer l'archive `.zip` (ou un dossier décompressé).
   L'analyse liste les séances, la période couverte et ce qui est exploitable.
3. **Sélection** — bornes de dates, durée et distance minimales, sports. Chaque
   séance écartée l'est pour une raison affichée.
4. **Envoi** — génération des lots, ou envoi automatique avec suivi des quotas.

Interface en français et en anglais, thème clair/sombre.

## Prérequis

- **Node ≥ 24** (voir `.nvmrc`)
- votre **export Polar Flow** : réglages du compte → « télécharger mes données ».
  Polar l'envoie par courriel, sous quelques heures à quelques jours.
- pour la voie API seulement : une **application Strava**
  (<https://www.strava.com/settings/api>) et un abonnement Strava actif.

## Installation

```bash
npm install
npm run dev
```

L'interface est sur <http://localhost:5173>, le backend sur le port 8787.

Pour la voie API, il faut en plus renseigner les identifiants :

```bash
cp .env.example .env      # puis STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET
```

> ⚠ Dans les réglages de votre application Strava, le champ **« Authorization
> Callback Domain » doit valoir exactement `localhost`** — le domaine seul, sans
> protocole ni port, et non `127.0.0.1`. C'est la cause d'échec la plus fréquente.

## Vérifier son export sans rien envoyer

```bash
npm run verify -- "C:\chemin\vers\polar-user-data-export_….zip"
```

Affiche la répartition des séances par sport, ce qui est exploitable, et génère
quelques fichiers d'exemple dans `.data/samples/` — le FIT produit y est relu avec
le décodeur officiel Garmin pour confirmer qu'il est valide.

## Pourquoi le format FIT

Le TCX ne sait exprimer que trois sports : `Running`, `Biking` ou `Other`. Une
randonnée, une marche, un squash ou une séance de musculation y arriveraient donc
en « Workout » générique — et par la voie fichiers, il n'y a aucune API pour
corriger cela ensuite : ce serait à refaire à la main, activité par activité.

Le FIT porte un vrai couple `sport` / `sub_sport` que Strava lit. Sur un export
réel, une randonnée sort en `hiking` et un squash en `racket`/`squash`.

Il est en outre **beaucoup** plus compact : pour une sortie de 6 h 45 à 1 Hz,
522 Ko contre 15 Mo en TCX.

L'encodage passe par le SDK officiel Garmin (`@garmin/fitsdk`) : le FIT est un
format binaire à définitions de messages et CRC, dont les enums de sports changent
à chaque version du profil. Le TCX reste disponible en repli, utile au diagnostic
puisqu'il est lisible.

## Combien de temps ça prend

**Voie fichiers** — les séances sont écrites dans des sous-dossiers `lot-01`,
`lot-02`… de 15 fichiers. Il n'y a plus qu'à glisser un dossier après l'autre sur
<https://www.strava.com/upload/select>. Le glisser-déposer lui-même ne prend que
quelques secondes par lot, mais **Strava plafonne cette page à 30 séances par
jour, soit deux lots de 15** : au-delà, les envois se mettent à échouer et il faut
reprendre le lendemain au lot suivant. Un historique de 700 séances s'étale donc
sur une **vingtaine de jours** (700 ÷ 30 ≈ 24). Ce plafond n'est pas documenté par
Strava : la valeur vient d'une mesure.

**Voie API** — Strava limite à 200 requêtes par 15 minutes et 2 000 par jour, et
une séance consomme 2 à 3 requêtes. Un historique de 700 séances demande donc
plusieurs jours. C'est prévu : la progression est écrite sur disque au fil de
l'eau, l'outil attend de lui-même que le quota se libère (avec compte à rebours à
l'écran), et relancer l'envoi reprend là où il s'était arrêté.

À volume égal, la voie API est donc **bien plus rapide** : son quota journalier
autorise plusieurs centaines de séances, contre 30 par la page d'upload. C'est le
prix de l'abonnement qui départage, pas le débit.

Deux façons de réduire fortement le volume, quelle que soit la voie :

- **borner les dates** pour s'arrêter juste avant l'activation de la
  synchronisation Polar ↔ Strava ;
- **fixer une durée minimale** — un export réel est souvent dominé par les
  trajets domicile-travail, sans intérêt dans un historique (dans l'export qui a
  servi de référence : 309 séances de 12 minutes sur 726).

## Doublons

Une séance déjà présente dans Strava n'est pas dupliquée : Strava la reconnaît et
l'ignore. Renvoyer un lot deux fois ne crée donc pas d'activités en double. Par la
voie API, le doublon est rapporté comme tel, sans échec ni nouvelle tentative, et
chaque envoi porte le nom du fichier Polar d'origine comme `external_id`.

## Confidentialité

- Le jeton Strava, le journal de reprise et le cache de scan restent dans
  `.data/`, **ignoré par git**.
- L'archive Polar contient des données de santé (date de naissance, poids,
  fréquence cardiaque de repos). Elles ne sont ni envoyées ni recopiées : seules
  les mesures d'entraînement partent vers Strava.

## Documentation

- [`docs/polar-export.md`](docs/polar-export.md) — rétro-ingénierie du format
  d'export Polar Flow, et les quatre pièges qui font échouer un import naïf.
- [`AGENTS.md`](AGENTS.md) — guide de développement.

## Licence

MIT — voir [`LICENSE`](LICENSE).
