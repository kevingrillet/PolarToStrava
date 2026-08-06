/**
 * Correspondance vers les sports du profil FIT.
 *
 * Contrairement au TCX, qui ne connaît que `Running`, `Biking` et `Other`, le FIT
 * porte un vrai couple `sport` / `sub_sport`. C'est ce qui permet d'obtenir
 * Randonnée, Marche, Squash ou Musculation **sans** passer par l'API Strava, donc
 * sans abonnement.
 *
 * Le mapping part du `StravaSportType` déjà résolu (voir `../polar/sports.ts`) et
 * non du `sport.id` Polar : il y a ainsi une seule table à tenir, et les
 * réaffectations manuelles faites dans l'interface sont respectées d'office.
 *
 * Les valeurs proviennent du profil du SDK officiel Garmin (`Profile.types.sport`
 * et `Profile.types.subSport`, version 21.212) — jamais devinées : `squash` par
 * exemple n'est pas un sport mais un **sous**-sport (94) du sport `racket` (64).
 */
import type { StravaSportType } from '../polar/sports';

/** Sports du profil FIT utilisés ici. */
export type FitSportName =
  | 'generic'
  | 'running'
  | 'cycling'
  | 'fitnessEquipment'
  | 'swimming'
  | 'soccer'
  | 'tennis'
  | 'training'
  | 'walking'
  | 'crossCountrySkiing'
  | 'alpineSkiing'
  | 'snowboarding'
  | 'rowing'
  | 'hiking'
  | 'paddling'
  | 'eBiking'
  | 'golf'
  | 'inlineSkating'
  | 'rockClimbing'
  | 'sailing'
  | 'iceSkating'
  | 'snowshoeing'
  | 'standUpPaddleboarding'
  | 'surfing'
  | 'kayaking'
  | 'windsurfing'
  | 'kitesurfing'
  | 'hiit'
  | 'racket'
  | 'wheelchairPushRun'
  | 'mobility';

/** Sous-sports du profil FIT utilisés ici. */
export type FitSubSportName =
  | 'generic'
  | 'treadmill'
  | 'trail'
  | 'indoorCycling'
  | 'road'
  | 'mountain'
  | 'indoorRowing'
  | 'elliptical'
  | 'stairClimbing'
  | 'flexibilityTraining'
  | 'strengthTraining'
  | 'indoorSkiing'
  | 'yoga'
  | 'pilates'
  | 'gravelCycling'
  | 'handCycling'
  | 'squash'
  | 'badminton'
  | 'pickleball'
  | 'racquetball'
  | 'tableTennis';

export interface FitSport {
  readonly sport: FitSportName;
  readonly subSport: FitSubSportName;
}

/**
 * Table complète : `Record` sur l'union `StravaSportType`, donc **exhaustive à la
 * compilation** — ajouter un type Strava sans lui donner d'équivalent FIT est une
 * erreur de build, pas un silence à l'exécution.
 */
const FIT_BY_STRAVA_TYPE: Readonly<Record<StravaSportType, FitSport>> = {
  Run: { sport: 'running', subSport: 'generic' },
  TrailRun: { sport: 'running', subSport: 'trail' },
  Ride: { sport: 'cycling', subSport: 'generic' },
  MountainBikeRide: { sport: 'cycling', subSport: 'mountain' },
  GravelRide: { sport: 'cycling', subSport: 'gravelCycling' },
  EBikeRide: { sport: 'eBiking', subSport: 'generic' },
  Walk: { sport: 'walking', subSport: 'generic' },
  Hike: { sport: 'hiking', subSport: 'generic' },
  Swim: { sport: 'swimming', subSport: 'generic' },
  WeightTraining: { sport: 'training', subSport: 'strengthTraining' },
  // `training` + `generic` est ce que Strava interprète comme « Workout ».
  Workout: { sport: 'training', subSport: 'generic' },
  HighIntensityIntervalTraining: { sport: 'hiit', subSport: 'generic' },
  Yoga: { sport: 'training', subSport: 'yoga' },
  Pilates: { sport: 'training', subSport: 'pilates' },
  Elliptical: { sport: 'fitnessEquipment', subSport: 'elliptical' },
  StairStepper: { sport: 'fitnessEquipment', subSport: 'stairClimbing' },
  Rowing: { sport: 'rowing', subSport: 'generic' },
  VirtualRow: { sport: 'rowing', subSport: 'indoorRowing' },
  Soccer: { sport: 'soccer', subSport: 'generic' },
  Squash: { sport: 'racket', subSport: 'squash' },
  Tennis: { sport: 'tennis', subSport: 'generic' },
  Badminton: { sport: 'racket', subSport: 'badminton' },
  TableTennis: { sport: 'racket', subSport: 'tableTennis' },
  Pickleball: { sport: 'racket', subSport: 'pickleball' },
  Racquetball: { sport: 'racket', subSport: 'racquetball' },
  AlpineSki: { sport: 'alpineSkiing', subSport: 'generic' },
  NordicSki: { sport: 'crossCountrySkiing', subSport: 'generic' },
  Snowboard: { sport: 'snowboarding', subSport: 'generic' },
  Snowshoe: { sport: 'snowshoeing', subSport: 'generic' },
  IceSkate: { sport: 'iceSkating', subSport: 'generic' },
  InlineSkate: { sport: 'inlineSkating', subSport: 'generic' },
  // Le FIT n'a pas de sport « skateboard » : on reste générique plutôt que de
  // le ranger sous une discipline qui n'est pas la bonne.
  Skateboard: { sport: 'generic', subSport: 'generic' },
  RockClimbing: { sport: 'rockClimbing', subSport: 'generic' },
  Kayaking: { sport: 'kayaking', subSport: 'generic' },
  Canoeing: { sport: 'paddling', subSport: 'generic' },
  StandUpPaddling: { sport: 'standUpPaddleboarding', subSport: 'generic' },
  Surfing: { sport: 'surfing', subSport: 'generic' },
  Kitesurf: { sport: 'kitesurfing', subSport: 'generic' },
  Windsurf: { sport: 'windsurfing', subSport: 'generic' },
  Sail: { sport: 'sailing', subSport: 'generic' },
  Golf: { sport: 'golf', subSport: 'generic' },
  Wheelchair: { sport: 'wheelchairPushRun', subSport: 'generic' },
  Handcycle: { sport: 'cycling', subSport: 'handCycling' },
};

/**
 * Sous-sport « en salle » à substituer quand la séance est faite sur machine
 * fixe. Sans ça, une course sur tapis serait indiscernable d'une sortie dehors.
 */
const INDOOR_SUB_SPORT: Partial<Record<FitSportName, FitSubSportName>> = {
  running: 'treadmill',
  cycling: 'indoorCycling',
  rowing: 'indoorRowing',
  crossCountrySkiing: 'indoorSkiing',
};

/**
 * Couple `sport` / `sub_sport` FIT correspondant à un type Strava.
 *
 * `indoor` reflète le drapeau porté par le sport Polar (tapis, home-trainer…) :
 * il affine le sous-sport quand un équivalent existe, sinon il est ignoré.
 */
export function fitSportFor(sportType: StravaSportType, indoor = false): FitSport {
  const base = FIT_BY_STRAVA_TYPE[sportType];
  if (!indoor) return base;

  const indoorSub = INDOOR_SUB_SPORT[base.sport];
  // On ne remplace qu'un sous-sport générique : un `trail` ou un
  // `strengthTraining` déjà précis vaut mieux que la variante « intérieur ».
  if (indoorSub === undefined || base.subSport !== 'generic') return base;
  return { sport: base.sport, subSport: indoorSub };
}
