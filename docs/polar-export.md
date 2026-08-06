# Format de l'export Polar Flow

Rétro-ingénierie de l'export « télécharger mes données » de Polar Flow, faite sur
une archive réelle (**export version 2.6**, 3 157 entrées, 726 séances,
2018 → 2026). Polar ne documente pas ce format ; ce fichier consigne ce qui a été
observé, et surtout les pièges qui font échouer un import naïf.

> Les libellés de sport et les particularités ci-dessous ont été vérifiés sur un
> seul compte. Un autre export peut exposer des `sport.id` absents du
> dictionnaire : l'application les signale au lieu de les deviner.

## Contenu de l'archive

| Famille                                              |     n | Utile ?                                                          |
| ---------------------------------------------------- | ----: | ---------------------------------------------------------------- |
| `activity-<date>-<uuid>`                             | 2 373 | non — activité quotidienne (pas, sommeil léger), pas des séances |
| `training-session_…`                                 |   726 | **oui** — les séances d'entraînement                             |
| `247ohr_<année>_<mois>`                              |    45 | non — fréquence cardiaque continue                               |
| `sleep_result`, `sleep_score`, `nightly_recovery*`   |     4 | non                                                              |
| `sport-profiles`                                     |     1 | non — profils de l'utilisateur, **sans** id numérique            |
| `calendar-items`                                     |     1 | non — notes, ressentis, poids                                    |
| `account-*`, `products-devices`, `profile-picture-*` |     6 | non                                                              |

Seuls les `training-session_*.json` sont lus.

### Nom de fichier

```
training-session_2023-11-15T12-23-32_7766215556-10104cf7-1468-4616-8ef5-9b64e8716dc1.json
                 └── date + heure locales ──┘ └─ id séance ─┘└──────── uuid ────────┘
```

Séparateurs `_`, et l'**heure** est présente (avec `-` à la place des `:`).
Certaines séances portent un uuid au lieu de l'id numérique :

```
training-session_2026-06-09T17-21-09_0e193154-…-070329f20efa-00e0a869-…-a59b8c0ec2fb.json
```

> ⚠ Le billet de référence décrit `training-session-2019-01-18-3142858899-<uuid>.json`
> (tirets, sans heure) et filtre dessus avec `awk -F"-" '$3==2023'`. Ce format
> n'existe plus : un tel filtre ne correspondrait à rien.

## Structure d'une séance

```jsonc
{
  "identifier": { "id": "5022701696" },
  "startTime": "2020-08-18T10:23:06",   // heure LOCALE, sans fuseau
  "stopTime": "2020-08-18T17:07:55",
  "name": "",                            // presque toujours vide
  "timezoneOffsetMinutes": 120,          // le fuseau est ici
  "durationMillis": 24284627,
  "distanceMeters": 18730.5,             // absent en salle
  "calories": 3972,
  "hrAvg": 123, "hrMax": 174,
  "latitude": 46.93, "longitude": 4.73,  // point de départ, si GPS
  "sport": { "id": "11" },               // id NUMÉRIQUE, non résolu dans l'archive
  "product": { "modelName": "Polar Vantage M" },
  "application": { "name": "Polar Flow" }, // ou "Polar Connect"
  "physicalInformation": { … },          // données de santé — non utilisées
  "exercises": [ { … } ]                 // 1 en général, plusieurs en multisport
}
```

### Un exercice

```jsonc
{
  "startTime": "2020-08-18T10:23:06",
  "durationMillis": 24284627,
  "distanceMeters": 18730.5,
  "ascentMeters": 808.187, "descentMeters": 782.279,
  "timezoneOffsetMinutes": 120,
  "sport": { "id": "11" },
  "samples": { "samples": [ /* canaux, voir ci-dessous */ ] },
  "routes": { "route": { "startTime": "…", "wayPoints": [ … ] },
              "transitionRoute": { … } },      // multisport
  "laps": { "laps": [ … ], "autoLaps": [ … ] },
  "statistics": { "statistics": [ { "type": "STATISTICS_TYPE_HEART_RATE",
                                    "min": 79, "avg": 123, "max": 174 } ] },
  "pauseTimes": [ { "startTime": "…", "endTime": "…" } ]
}
```

## Les quatre pièges

### 1. `NaN` nu — le JSON n'est pas valide

Les canaux d'échantillons contiennent des littéraux `NaN` bruts :

```json
{ "type": "SPEED", "intervalMillis": 1000, "values": [NaN, NaN, 18.0, 18.5] }
```

`NaN` n'existe pas en JSON : **`JSON.parse` lève** sur la quasi-totalité du
corpus. Il faut assainir avant de parser, en épargnant les `NaN` situés dans une
chaîne (`core/polar/json.ts`).

Un `NaN` signifie « pas de mesure » et doit rester un trou : le remplacer par
zéro fabriquerait une fréquence cardiaque nulle ou une vitesse nulle.

### 2. Dates locales naïves

`startTime` n'a **pas** de fuseau ; le décalage est à côté, dans
`timezoneOffsetMinutes`. Interpréter la chaîne telle quelle décale toutes les
activités de plusieurs heures. Instant réel :

```
epoch = Date.parse(startTime + 'Z') − timezoneOffsetMinutes × 60000
```

### 3. Échantillons sans horodatage, GPS sur une autre base de temps

Les canaux sont des tableaux de valeurs et un seul `intervalMillis` (toujours
`1000` dans le corpus observé) : l'instant du point `i` vaut
`startTime + i × intervalMillis`.

Les waypoints, eux, portent un `elapsedMillis` relatif à
**`routes.route.startTime`**, qui n'est pas forcément le `startTime` de
l'exercice. Il faut donc tout ramener en absolu avant de fusionner.

```jsonc
{ "longitude": 4.732505, "latitude": 46.93769167, "altitude": 183.0, "elapsedMillis": 4002 }
```

Canaux rencontrés (nombre de séances les portant, sur 726) :

| Canal         |   n | Unité     | Remarque                             |
| ------------- | --: | --------- | ------------------------------------ |
| `HEART_RATE`  | 726 | bpm       |                                      |
| `TEMPERATURE` | 726 | °C        | inutilisé (aucun équivalent TCX)     |
| `SPEED`       | 726 | **km/h**  | TCX attend des m/s → diviser par 3,6 |
| `DISTANCE`    | 726 | m cumulés |                                      |
| `ALTITUDE`    | 353 | m         | voir piège 4                         |
| `CADENCE`     |  28 | rpm / spm | TCX borne à 254                      |

L'unité de `SPEED` se vérifie sur les statistiques : `avg = 2,7766` pour
18 730,5 m en 24 284,6 s, soit 0,771 m/s = **2,777 km/h**.

`routes` est présent sur les 726 séances mais ne contient un `route` que sur 355 :
il peut être vide (`{}`), et `wayPoints` peut exister avec zéro élément.

### 4. L'altimètre démarre à 0

Contrairement aux autres canaux, `ALTITUDE` n'utilise pas `NaN` pour « pas de
mesure » : il renvoie **`0`** le temps de se caler, quelques secondes en début de
séance. Sur la sortie de référence, les 4 premiers points annoncent 0 m alors que
le terrain est à 183 m — conserver ces points fabriquerait un dénivelé positif
fictif de +183 m.

Les points qui ne portent **que** une altitude sont donc écartés
(`core/polar/session.ts`).

## Sports

L'archive ne résout pas les `sport.id` : `sport-profiles-*.json` liste les profils
de l'utilisateur par **nom**, sans id numérique, et `calendar-items` ne porte pas
le sport. Le dictionnaire de `core/polar/sports.ts` provient donc de l'interface
Polar Flow (sélecteur de sport et cartes de profils).

Ids observés dans l'export de référence :

|  id | sport                   |   n |  id | sport                   |   n |
| --: | ----------------------- | --: | --: | ----------------------- | --: |
|   2 | Cyclisme                | 309 |  38 | Vélo de route           |   9 |
|  83 | Autre sport d'intérieur | 231 |  17 | Course sur tapis        |   6 |
|  13 | Squash                  |  73 |   1 | Course à pied           |   4 |
|  50 | Futsal                  |  54 |  15 | Séance de musculation   |   4 |
|   3 | Marche à pied           |  18 |  18 | Vélo d'intérieur        |   3 |
|  11 | Randonnée               |  12 |  39 | Football                |   2 |
|     |                         |     |  16 | Autre sport d'extérieur |   1 |

Les ids 11, 13, 16, 17, 18, 38, 39, 50 et 83 **n'apparaissent pas** dans le
sélecteur de sport actuel de Polar Flow : ce sont des profils historiques ou
agrégés. C'est pourquoi le dictionnaire ne peut pas se contenter de cette liste,
et pourquoi l'interface laisse réaffecter le type Strava sport par sport.

## Volumétrie

- archive : ~50 Mo compressés, ~200 Mo de séances décompressées ;
- une séance : 13 Ko (médiane 100 Ko) à **8,3 Mo** pour une sortie de 6 h 45 ;
- pour cette même sortie (24 281 points, 24 267 positions GPS) :

  | Format |       Brut |  Compressé |
  | ------ | ---------: | ---------: |
  | TCX    |  15 152 Ko |     416 Ko |
  | FIT    | **522 Ko** | **271 Ko** |

D'où la lecture par lots (`server/polarExport.ts`), et le choix du FIT par défaut :
29× plus compact, et surtout porteur du sport, que le TCX ne sait pas exprimer.
