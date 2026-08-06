/**
 * Jeux d'essai reproduisant **fidèlement** la forme d'un export Polar Flow réel
 * (version d'export 2.6), y compris ses irrégularités : dates locales naïves,
 * littéraux `NaN` nus dans les canaux, `routes.route.startTime` décalé du départ
 * de l'exercice, canal `TEMPERATURE` inexploitable.
 *
 * Les valeurs sont synthétiques : un vrai fichier d'export contient des données
 * de santé personnelles (date de naissance, poids, FC de repos) qui n'ont rien à
 * faire dans un dépôt. Seule la **structure** est copiée du corpus de référence.
 */

/** Séance de plein air avec GPS, FC, vitesse, distance et deux tours (sport 2 = Cyclisme). */
export const OUTDOOR_RIDE_JSON = `{
  "identifier": { "id": "5022701696" },
  "created": "2020-08-18T15:22:39.000",
  "startTime": "2020-08-18T10:23:06",
  "stopTime": "2020-08-18T10:23:12",
  "name": "",
  "deviceId": "659C6329",
  "durationMillis": 6000,
  "distanceMeters": 27.0,
  "calories": 12,
  "hrMax": 123,
  "hrAvg": 121,
  "timezoneOffsetMinutes": 120,
  "sport": { "id": "2" },
  "product": { "modelName": "Polar Vantage M" },
  "application": { "name": "Polar Flow" },
  "exercises": [
    {
      "identifier": { "id": "5038142736" },
      "startTime": "2020-08-18T10:23:06",
      "stopTime": "2020-08-18T10:23:12",
      "durationMillis": 6000,
      "distanceMeters": 27.0,
      "calories": 12,
      "ascentMeters": 5.0,
      "descentMeters": 0.0,
      "timezoneOffsetMinutes": 120,
      "sport": { "id": "2" },
      "laps": {
        "laps": [
          { "splitTimeMillis": 3000, "durationMillis": 3000 },
          { "splitTimeMillis": 6000, "durationMillis": 3000, "distanceMeters": 27.0 }
        ]
      },
      "statistics": {
        "statistics": [
          { "type": "STATISTICS_TYPE_HEART_RATE", "min": 120, "avg": 121.5, "max": 123 },
          { "type": "STATISTICS_TYPE_SPEED", "min": null, "avg": 19.0, "max": 21.6 }
        ]
      },
      "samples": {
        "samples": [
          { "type": "TEMPERATURE", "intervalMillis": 1000, "values": [20, 20, 20, 20, 20, 20] },
          { "type": "HEART_RATE", "intervalMillis": 1000, "values": [NaN, 120, 121, 122, 123, NaN] },
          { "type": "SPEED", "intervalMillis": 1000, "values": [NaN, 18.0, 18.5, 19.0, 20.0, 21.6] },
          { "type": "DISTANCE", "intervalMillis": 1000, "values": [NaN, 5.0, 10.2, 15.5, 21.1, 27.0] },
          { "type": "ALTITUDE", "intervalMillis": 1000, "values": [180, 181, 182, 183, 184, 185] }
        ]
      },
      "routes": {
        "route": {
          "startTime": "2020-08-18T10:23:06",
          "wayPoints": [
            { "longitude": 4.732505, "latitude": 46.93769167, "altitude": 183.0, "elapsedMillis": 2000 },
            { "longitude": 4.73247333, "latitude": 46.93769833, "altitude": 186.0, "elapsedMillis": 3000 },
            { "longitude": 4.73237667, "latitude": 46.93770667, "altitude": 189.0, "elapsedMillis": 4000 }
          ]
        }
      },
      "pauseTimes": []
    }
  ]
}`;

/**
 * Séance en salle sans aucune donnée exploitable (sport 83 = « Autre sport
 * d'intérieur »). Ce cas représente près d'un tiers d'un corpus réel : tous les
 * canaux existent mais ne contiennent que des `NaN`, et il n'y a ni GPS ni
 * distance. Le TCX produit serait vide, donc rejeté par Strava.
 */
export const EMPTY_INDOOR_JSON = `{
  "identifier": { "id": "7988731125" },
  "startTime": "2024-10-22T17:55:00",
  "stopTime": "2024-10-22T18:55:22",
  "name": "",
  "durationMillis": 3503502,
  "calories": 457,
  "hrMax": 135,
  "hrAvg": 109,
  "timezoneOffsetMinutes": 120,
  "sport": { "id": "83" },
  "product": { "modelName": "Polar Vantage M" },
  "application": { "name": "Polar Connect" },
  "exercises": [
    {
      "identifier": { "id": "8016719382" },
      "startTime": "2024-10-22T17:55:00",
      "durationMillis": 3503502,
      "calories": 457,
      "timezoneOffsetMinutes": 120,
      "sport": { "id": "83" },
      "samples": {
        "samples": [
          { "type": "TEMPERATURE", "intervalMillis": 1000, "values": [NaN, NaN, NaN] },
          { "type": "HEART_RATE", "intervalMillis": 1000, "values": [NaN, NaN, NaN] },
          { "type": "SPEED", "intervalMillis": 1000, "values": [NaN, NaN, NaN] },
          { "type": "DISTANCE", "intervalMillis": 1000, "values": [NaN, NaN, NaN] }
        ]
      },
      "routes": {},
      "pauseTimes": []
    }
  ]
}`;

/**
 * Séance de tapis de course (sport 17) : pas de GPS, mais cadence et distance.
 * Sert à vérifier le drapeau `trainer` et la piste sans position.
 */
export const TREADMILL_JSON = `{
  "identifier": { "id": "5215337281" },
  "startTime": "2020-10-08T12:14:33",
  "stopTime": "2020-10-08T12:14:37",
  "name": "Fractionné",
  "durationMillis": 4000,
  "distanceMeters": 20.0,
  "calories": 30,
  "timezoneOffsetMinutes": 120,
  "sport": { "id": "17" },
  "product": { "modelName": "Polar Vantage M" },
  "application": { "name": "Polar Flow" },
  "exercises": [
    {
      "startTime": "2020-10-08T12:14:33",
      "durationMillis": 4000,
      "distanceMeters": 20.0,
      "calories": 30,
      "timezoneOffsetMinutes": 120,
      "sport": { "id": "17" },
      "samples": {
        "samples": [
          { "type": "HEART_RATE", "intervalMillis": 1000, "values": [140, 142, 145, 147] },
          { "type": "CADENCE", "intervalMillis": 1000, "values": [80, 81, 82, 300] },
          { "type": "DISTANCE", "intervalMillis": 1000, "values": [0, 5.0, 12.0, 20.0] },
          { "type": "SPEED", "intervalMillis": 1000, "values": [0, 18.0, 25.2, 28.8] }
        ]
      },
      "routes": {},
      "pauseTimes": [{ "startTime": "2020-10-08T12:14:35", "endTime": "2020-10-08T12:14:36" }]
    }
  ]
}`;
