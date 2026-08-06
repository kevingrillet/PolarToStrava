/**
 * Dictionnaire des sports Polar et correspondance vers Strava.
 *
 * L'export Polar ne nomme pas les sports : chaque séance porte un
 * `sport.id` **numérique** (`"sport": { "id": "2" }`) et aucun fichier de
 * l'archive ne fournit le dictionnaire — `sport-profiles-*.json` liste bien les
 * profils de l'utilisateur mais avec leur nom, sans l'id numérique.
 *
 * Les libellés ci-dessous proviennent donc du sélecteur de sport de Polar Flow
 * (attributs `data-value` de la liste déroulante, locale FR). Cette liste ne
 * couvre que les sports **actuellement sélectionnables** : les exports contiennent
 * aussi des ids historiques ou produits par `Polar Connect` qui n'y figurent plus
 * (voir `UNKNOWN_SPORT_HINTS`). Ces ids-là restent résolus en « Workout » et sont
 * signalés à l'utilisateur pour arbitrage manuel dans l'interface.
 */

/**
 * `sport_type` acceptés par Strava. Sous-ensemble volontairement limité aux
 * valeurs vers lesquelles on sait mapper : tout le reste tombe sur `Workout`.
 */
export type StravaSportType =
  | 'AlpineSki'
  | 'Badminton'
  | 'Canoeing'
  | 'EBikeRide'
  | 'Elliptical'
  | 'Golf'
  | 'GravelRide'
  | 'Handcycle'
  | 'HighIntensityIntervalTraining'
  | 'Hike'
  | 'IceSkate'
  | 'InlineSkate'
  | 'Kayaking'
  | 'Kitesurf'
  | 'MountainBikeRide'
  | 'NordicSki'
  | 'Pickleball'
  | 'Pilates'
  | 'Racquetball'
  | 'Ride'
  | 'RockClimbing'
  | 'Rowing'
  | 'Run'
  | 'Sail'
  | 'Skateboard'
  | 'Snowboard'
  | 'Snowshoe'
  | 'Soccer'
  | 'Squash'
  | 'StairStepper'
  | 'StandUpPaddling'
  | 'Surfing'
  | 'Swim'
  | 'TableTennis'
  | 'Tennis'
  | 'TrailRun'
  | 'VirtualRow'
  | 'Walk'
  | 'WeightTraining'
  | 'Wheelchair'
  | 'Windsurf'
  | 'Workout'
  | 'Yoga';

/** Valeurs admises par l'attribut `Sport` du format TCX — il n'y en a que trois. */
export type TcxSport = 'Running' | 'Biking' | 'Other';

/** Libellés officiels (locale FR) issus du sélecteur de sport de Polar Flow. */
export const POLAR_SPORTS: Readonly<Record<number, string>> = {
  1: 'Course à pied',
  2: 'Cyclisme',
  3: 'Marche à pied',
  4: 'Jogging',
  5: 'VTT',
  6: 'Ski',
  7: 'Ski alpin',
  8: 'Aviron',
  9: 'Marche nordique',
  10: 'Skate',
  11: 'Randonnée',
  12: 'Tennis',
  13: 'Squash',
  14: 'Badminton',
  15: 'Séance de musculation',
  16: "Autre sport d'extérieur",
  17: 'Course sur tapis',
  18: "Vélo d'intérieur",
  19: 'Course sur route',
  20: 'Entraînement en circuit',
  22: 'Snowboard',
  23: 'Natation',
  24: 'Skating, ski de fond',
  25: 'Classique, ski de fond',
  27: 'Trail',
  28: 'Patins à glace',
  29: 'Roller',
  30: 'Patins à roulettes',
  32: 'Exercice de groupe',
  33: 'Yoga',
  34: 'HIIT',
  35: 'Golf',
  36: 'Course sur piste',
  38: 'Vélo de route',
  39: 'Football',
  40: 'Cricket',
  41: 'Basketball',
  42: 'Baseball',
  43: 'Rugby',
  44: 'Hockey sur gazon',
  45: 'Volleyball',
  46: 'Hockey sur glace',
  47: 'Football américain',
  48: 'Handball',
  49: 'Beach volley',
  50: 'Futsal',
  51: 'Floorball',
  52: 'Dance',
  53: 'Équitation (trot)',
  54: 'Équitation',
  55: 'Cross-trainer',
  56: 'Arts martiaux',
  57: 'Entraînement fonctionnel',
  58: 'Bootcamp',
  59: 'Roller-Freestyle',
  60: 'Roller-classique',
  61: 'Fitness',
  62: 'Aquagym',
  63: 'Step',
  64: 'Body&Mind',
  65: 'Pilates',
  66: 'Stretching',
  67: 'Fitness-dancing',
  68: 'Triathlon',
  69: 'Duathlon',
  70: 'Off-road triathlon',
  71: 'Off-road duathlon',
  83: "Autre sport d'intérieur",
  84: "Course d'orientation",
  85: "Course d'orientation à ski",
  86: "Course d'orientation à VTT",
  87: 'Biathlon',
  88: 'Voile',
  89: 'Course en fauteuil roulant',
  90: 'Disque-golf',
  91: 'Tennis de table',
  92: 'Ultramarathon',
  94: 'Escalade (intérieur)',
  95: 'Kayak',
  96: 'Canoë',
  100: 'Kitesurf',
  101: 'Planche à voile',
  102: 'Surf',
  103: 'Natation en piscine',
  104: 'Baseball finlandais',
  105: 'Natation en eau libre',
  107: 'Wakeboard',
  108: 'Ski nautique',
  109: 'Boxe',
  110: 'Kickboxing',
  111: 'Mobilité (dynamique)',
  112: 'Télémark',
  113: 'Ski de randonnée nordique',
  114: 'Gymnastique',
  115: 'Judo',
  116: 'Randonnée en raquettes',
  117: 'Aviron en salle',
  118: 'Cardiovélo',
  119: 'Rue',
  120: 'Latine',
  121: 'Show',
  122: 'Ballet',
  123: 'Jazz',
  124: 'Moderne',
  125: 'Salon',
  126: 'Base',
  127: 'Mobilité (statique)',
  128: 'LES MILLS BODYPUMP',
  129: 'LES MILLS BODYATTACK',
  130: 'LES MILLS BODYCOMBAT',
  131: 'LES MILLS GRIT Cardio',
  132: 'LES MILLS GRIT Strength',
  133: 'LES MILLS GRIT Athletic',
  134: "LES MILLS SH'BAM",
  135: 'LES MILLS RPM',
  136: 'LES MILLS BODYJAM',
  137: 'LES MILLS BODYSTEP',
  138: 'LES MILLS SPRINT',
  139: 'LES MILLS TONE',
  140: 'LES MILLS BODYBALANCE',
  141: 'LES MILLS THE TRIP',
  142: 'LES MILLS CORE',
  143: 'LES MILLS BARRE',
  144: 'Boxe fitness',
  147: 'Curling',
  148: 'Kettlebell',
  149: 'Trotinette',
  153: "Course d'obstacles",
  154: 'Ringette',
  155: 'Tir sportif (extérieur)',
  156: 'Skateboard',
  157: 'SUP',
  158: 'Taekwondo',
  163: 'Aquajogging',
  164: 'Sports aquatiques',
  173: 'Sports motorisés',
  174: 'Hard enduro',
  175: 'Course automobile',
  176: 'Padel',
  177: 'Vélo électrique',
  178: 'Cross',
  179: 'Escalade (extérieur)',
  180: 'Enduro',
  181: 'Course mécanique sur route',
  182: 'Snocross',
  183: 'Moto-cross',
  184: 'Saut à la corde',
  185: "Sport d'escaliers",
  186: 'Ultimate',
  187: 'Para-hockey sur glace',
  188: 'Pickleball',
  189: 'Handbike',
  190: 'Agility',
  191: 'Esport',
  192: 'Basket fauteuil',
  193: 'Tennis fauteuil',
  194: 'Tir sportif (intérieur)',
  195: 'Gravel',
  196: 'Ski nautique adapté',
  197: 'Beach tennis',
  202: 'Course de fitness',
  203: 'Marche lestée',
  204: 'Callisthénie',
  205: 'Machine à ski',
};

/**
 * Correspondance sport Polar → `sport_type` Strava. Les ids absents retombent
 * sur `Workout`, qui est le fourre-tout accepté par Strava.
 */
const STRAVA_BY_POLAR_ID: Readonly<Record<number, StravaSportType>> = {
  1: 'Run',
  4: 'Run',
  17: 'Run', // course sur tapis → Run + trainer
  19: 'Run',
  36: 'Run',
  92: 'Run',
  27: 'TrailRun',
  178: 'TrailRun',
  202: 'Run',
  2: 'Ride',
  5: 'MountainBikeRide',
  18: 'Ride', // vélo d'intérieur → Ride + trainer
  38: 'Ride',
  195: 'GravelRide',
  177: 'EBikeRide',
  118: 'Ride',
  3: 'Walk',
  9: 'Walk',
  203: 'Walk',
  11: 'Hike',
  116: 'Snowshoe',
  13: 'Squash',
  39: 'Soccer',
  50: 'Soccer', // futsal : Strava n'a pas de type dédié
  23: 'Swim',
  103: 'Swim',
  105: 'Swim',
  15: 'WeightTraining',
  148: 'WeightTraining',
  204: 'WeightTraining',
  128: 'WeightTraining',
  33: 'Yoga',
  126: 'Yoga',
  111: 'Yoga',
  127: 'Yoga',
  65: 'Pilates',
  66: 'Yoga',
  64: 'Yoga',
  34: 'HighIntensityIntervalTraining',
  131: 'HighIntensityIntervalTraining',
  132: 'HighIntensityIntervalTraining',
  133: 'HighIntensityIntervalTraining',
  138: 'HighIntensityIntervalTraining',
  8: 'Rowing',
  117: 'VirtualRow',
  55: 'Elliptical',
  185: 'StairStepper',
  12: 'Tennis',
  197: 'Tennis',
  91: 'TableTennis',
  176: 'Racquetball',
  188: 'Pickleball',
  14: 'Badminton',
  6: 'NordicSki',
  24: 'NordicSki',
  25: 'NordicSki',
  113: 'NordicSki',
  205: 'NordicSki',
  7: 'AlpineSki',
  112: 'AlpineSki',
  22: 'Snowboard',
  94: 'RockClimbing',
  179: 'RockClimbing',
  95: 'Kayaking',
  96: 'Canoeing',
  157: 'StandUpPaddling',
  102: 'Surfing',
  100: 'Kitesurf',
  101: 'Windsurf',
  88: 'Sail',
  28: 'IceSkate',
  29: 'InlineSkate',
  30: 'InlineSkate',
  59: 'InlineSkate',
  60: 'InlineSkate',
  10: 'Skateboard',
  156: 'Skateboard',
  35: 'Golf',
  89: 'Wheelchair',
  189: 'Handcycle',
  192: 'Wheelchair',
  193: 'Wheelchair',
};

/**
 * Sports pratiqués sur machine fixe : Strava attend `trainer = 1` pour ceux-là,
 * ce qui l'empêche de considérer l'absence de GPS comme une anomalie et exclut
 * l'activité des classements de segments.
 */
const INDOOR_SPORT_IDS: ReadonlySet<number> = new Set([
  17, // course sur tapis
  18, // vélo d'intérieur
  55, // cross-trainer
  117, // aviron en salle
  118, // cardiovélo
  185, // sport d'escaliers
  205, // machine à ski
]);

/** Résultat de la résolution d'un `sport.id` Polar. */
export interface ResolvedSport {
  readonly id: number;
  /** Libellé Polar si connu, sinon `Sport #<id>`. */
  readonly label: string;
  readonly stravaSportType: StravaSportType;
  readonly tcxSport: TcxSport;
  /** `true` si l'id est absent du dictionnaire : à faire confirmer par l'utilisateur. */
  readonly unknown: boolean;
  /** Machine fixe (tapis, home-trainer…) → `trainer = 1` côté Strava. */
  readonly indoor: boolean;
}

const RUNNING_TYPES: ReadonlySet<StravaSportType> = new Set<StravaSportType>(['Run', 'TrailRun']);

const BIKING_TYPES: ReadonlySet<StravaSportType> = new Set<StravaSportType>([
  'Ride',
  'MountainBikeRide',
  'GravelRide',
  'EBikeRide',
  'Handcycle',
]);

/** Déduit l'attribut `Sport` du TCX (3 valeurs possibles) depuis le type Strava. */
export function tcxSportFor(sportType: StravaSportType): TcxSport {
  if (RUNNING_TYPES.has(sportType)) return 'Running';
  if (BIKING_TYPES.has(sportType)) return 'Biking';
  return 'Other';
}

/**
 * Résout un `sport.id` Polar en libellé + type Strava + sport TCX.
 *
 * `overrides` permet à l'utilisateur de forcer le type Strava d'un id donné
 * (indispensable pour les ids inconnus, qui peuvent représenter une grande part
 * d'un corpus réel). Un override est toujours prioritaire.
 */
export function resolveSport(
  sportId: number,
  overrides: Readonly<Record<number, StravaSportType>> = {},
): ResolvedSport {
  const label = POLAR_SPORTS[sportId];
  const stravaSportType = overrides[sportId] ?? STRAVA_BY_POLAR_ID[sportId] ?? 'Workout';

  return {
    id: sportId,
    label: label ?? `Sport #${sportId}`,
    stravaSportType,
    tcxSport: tcxSportFor(stravaSportType),
    unknown: label === undefined,
    indoor: INDOOR_SPORT_IDS.has(sportId),
  };
}
