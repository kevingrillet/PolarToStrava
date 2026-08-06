/**
 * Dictionnaires de traduction (français / anglais).
 *
 * Le français est la langue de référence. L'interface `Messages` garantit que
 * les deux dictionnaires ont la même structure : il est impossible d'oublier une
 * section. Les chaînes sont organisées par domaine et résolues via `t('a.b.c')`
 * (notation pointée) dans `I18nProvider`.
 *
 * Pour ajouter une chaîne : étendre l'interface `Messages`, puis renseigner la
 * valeur dans `fr` ET `en` (TypeScript refusera la compilation sinon).
 */
export type Lang = 'fr' | 'en';

export const LANGS: Lang[] = ['fr', 'en'];

export interface Messages {
  app: { title: string };
  /** Libellés d'accessibilité réutilisables. */
  a11y: { skipToContent: string };
  theme: {
    toLight: string;
    toDark: string;
    light: string;
    dark: string;
    /** Libellé du sélecteur d'identité visuelle. */
    select: string;
    /** Noms des identités visuelles (clé = default | atelier | blueprint | aurora). */
    names: Record<string, string>;
  };
  language: { label: string; toggle: string };
  /** En-tête et pas de l'assistant d'import. */
  header: { subtitle: string };
  steps: { connect: string; load: string; select: string; send: string };
  /** Étape 1 — connexion Strava. */
  auth: {
    description: string;
    optional: string;
    optionalBadge: string;
    connect: string;
    disconnect: string;
    connectedAs: string;
    notConnected: string;
    notConfigured: string;
    notConfiguredHelp: string;
    denied: string;
    invalidState: string;
    missingScope: string;
    failed: string;
    backendDown: string;
  };
  /** Étape 2 — chargement de l'export. */
  load: {
    description: string;
    howToTitle: string;
    howTo1: string;
    howTo2: string;
    howTo3: string;
    howTo4: string;
    drop: string;
    browse: string;
    chooseFile: string;
    dropHint: string;
    uploading: string;
    uploaded: string;
    pathLabel: string;
    pathHint: string;
    scan: string;
    scanning: string;
    found: string;
    unreadable: string;
    range: string;
    withGps: string;
    unusable: string;
    unusableHelp: string;
    error: string;
  };
  /** Étape 3 — sélection des séances. */
  select: {
    description: string;
    from: string;
    to: string;
    minDuration: string;
    minDurationHint: string;
    minDistance: string;
    requireGps: string;
    includeUnusable: string;
    sports: string;
    sportsHelp: string;
    sportColumn: string;
    countColumn: string;
    stravaColumn: string;
    keptColumn: string;
    kept: string;
    excluded: string;
    alreadySent: string;
    reasons: Record<string, string>;
    preview: string;
    previewMore: string;
    empty: string;
  };
  /** Étape 4 — envoi. */
  send: {
    description: string;
    applySportType: string;
    applySportTypeHint: string;
    commute: string;
    redoDone: string;
    start: string;
    stop: string;
    running: string;
    quota: string;
    quotaShort: string;
    quotaDaily: string;
    waiting: string;
    estimate: string;
    estimateHelp: string;
    uploaded: string;
    duplicates: string;
    failed: string;
    skipped: string;
    doneTitle: string;
    stoppedTitle: string;
    resumeHint: string;
    states: Record<string, string>;
  };
  /** Choix de la voie d'envoi à l'étape 4. */
  mode: { label: string; api: string; apiHint: string; files: string; filesHint: string };
  /** Étape 4, variante « fichiers » (sans abonnement Strava). */
  files: {
    description: string;
    format: string;
    formatFit: string;
    formatTcx: string;
    batchSize: string;
    batchFree: string;
    batchSubscriber: string;
    outputDir: string;
    outputDirHint: string;
    tcxWarning: string;
    export: string;
    exporting: string;
    sessionsIn: string;
    batches: string;
    written: string;
    purged: string;
    failed: string;
    done: string;
    outputAt: string;
    step1: string;
    step2: string;
    step3: string;
    batchList: string;
    filesShort: string;
  };
  /** Indicateurs de données présentes sur une séance. */
  flags: { gps: string; heartRate: string; noData: string; indoor: string };
}

const fr: Messages = {
  app: {
    title: 'Polar → Strava',
  },
  a11y: { skipToContent: 'Aller au contenu' },
  theme: {
    toLight: 'Activer le mode clair',
    toDark: 'Activer le mode sombre',
    light: 'Mode clair',
    dark: 'Mode sombre',
    select: 'Thème',
    names: {
      default: 'Défaut',
      atelier: 'Atelier',
      blueprint: 'Blueprint',
      aurora: 'Aurora',
    },
  },
  language: { label: 'Langue', toggle: 'Passer en anglais' },
  header: {
    subtitle:
      'Importer l’historique que la synchronisation Polar ↔ Strava ne reprend pas : lecture de l’export Polar Flow, conversion en TCX, envoi étalé sur les quotas Strava.',
  },
  steps: {
    connect: 'Connexion Strava',
    load: 'Export Polar',
    select: 'Sélection des séances',
    send: 'Envoi',
  },
  auth: {
    description:
      'L’envoi passe par l’API Strava, qui demande une autorisation explicite. Le secret client reste sur le backend local : il n’atteint jamais le navigateur.',
    optional:
      'Cette étape ne sert qu’à l’envoi automatique par l’API, qui exige un abonnement Strava. Pour l’envoi par fichiers — la voie gratuite, sélectionnée par défaut à l’étape 4 — passez directement à l’étape 2.',
    optionalBadge: 'optionnel',
    connect: 'Se connecter à Strava',
    disconnect: 'Se déconnecter',
    connectedAs: 'Connecté en tant que',
    notConnected: 'Non connecté.',
    notConfigured: 'Application Strava non configurée.',
    notConfiguredHelp:
      'Copier .env.example vers .env et y renseigner STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET, obtenus sur strava.com/settings/api. Le champ « Authorization Callback Domain » doit valoir exactement : localhost',
    denied: 'Autorisation refusée sur Strava.',
    invalidState: 'Retour d’authentification invalide : recommencer la connexion.',
    missingScope:
      'La permission d’écriture (activity:write) n’a pas été accordée : l’envoi serait impossible. Se reconnecter en laissant la case cochée.',
    failed: 'Échec de l’échange du jeton avec Strava.',
    backendDown: 'Backend injoignable — vérifier que « npm run dev » tourne.',
  },
  load: {
    description:
      'Déposer l’archive ZIP reçue de Polar, ou indiquer son chemin. Rien n’est modifié ni envoyé à Strava à ce stade.',
    howToTitle: 'Obtenir l’archive auprès de Polar',
    howTo1: 'ouvrir account.polar.com et se connecter',
    howTo2: 'dans le menu de gauche, choisir « Télécharger mes données »',
    howTo3: 'cliquer sur « Télécharger » : Polar rassemble l’archive',
    howTo4:
      'un courriel arrive quand elle est prête — le délai dépend du volume — avec un lien valable deux semaines',
    drop: 'Déposer l’archive .zip ici',
    browse: 'ou parcourir…',
    chooseFile: 'Choisir l’archive d’export Polar',
    dropHint:
      'L’archive est recopiée dans .data/upload : elle ne quitte pas votre machine. Un dossier déjà décompressé ? Indiquez son chemin ci-dessous.',
    uploading: 'Copie de l’archive…',
    uploaded: 'Archive copiée',
    pathLabel: 'Chemin de l’export',
    pathHint: 'Archive .zip ou dossier contenant les fichiers training-session_*.json',
    scan: 'Analyser',
    scanning: 'Analyse en cours…',
    found: 'séances trouvées',
    unreadable: 'fichiers illisibles',
    range: 'Période couverte',
    withGps: 'avec trace GPS',
    unusable: 'sans donnée exploitable',
    unusableHelp:
      'Ces séances n’ont ni GPS, ni fréquence cardiaque, ni distance : le fichier produit serait vide et Strava le refuserait. Elles sont exclues par défaut.',
    error: 'Lecture impossible',
  },
  select: {
    description:
      'Ne garder que ce qui manque réellement à Strava. Les bornes de dates servent à s’arrêter avant la date de branchement de la synchronisation Polar ↔ Strava, pour ne pas créer de doublons.',
    from: 'À partir du',
    to: 'Jusqu’au',
    minDuration: 'Durée minimale (min)',
    minDurationHint: 'Écarte les trajets courts type domicile-travail.',
    minDistance: 'Distance minimale (km)',
    requireGps: 'Uniquement les séances avec GPS',
    includeUnusable: 'Inclure les séances sans donnée',
    sports: 'Sports',
    sportsHelp:
      'Le TCX ne sait exprimer que « course », « vélo » ou « autre » : le type précis est appliqué après l’envoi. Ajustable ici sport par sport.',
    sportColumn: 'Sport Polar',
    countColumn: 'Séances',
    stravaColumn: 'Type Strava',
    keptColumn: 'Retenues',
    kept: 'séances retenues',
    excluded: 'écartées',
    alreadySent: 'déjà envoyées',
    reasons: {
      'before-from': 'antérieures à la date de début',
      'after-to': 'postérieures à la date de fin',
      'too-short': 'trop courtes',
      'too-long': 'trop longues',
      'too-close': 'distance insuffisante',
      'no-gps': 'sans GPS',
      'sport-excluded': 'sport non retenu',
      unusable: 'sans donnée exploitable',
    },
    preview: 'Aperçu',
    previewMore: 'autres séances',
    empty: 'Aucune séance ne correspond aux critères.',
  },
  send: {
    description:
      'Les séances sont converties puis envoyées une par une. La progression est enregistrée sur disque : l’import peut être interrompu et reprendra où il s’est arrêté.',
    applySportType: 'Corriger le type de sport après envoi',
    applySportTypeHint:
      'Inutile en principe : le FIT envoyé porte déjà le sport. À n’activer que si les activités arrivent malgré tout en « Workout ». Coûte une requête de plus par séance.',
    commute: 'Marquer comme trajets domicile-travail',
    redoDone: 'Réenvoyer les séances déjà traitées',
    start: 'Démarrer l’envoi',
    stop: 'Interrompre',
    running: 'Envoi en cours',
    quota: 'Quota Strava',
    quotaShort: '15 min',
    quotaDaily: 'jour',
    waiting: 'Quota atteint — reprise dans',
    estimate: 'Estimation',
    estimateHelp:
      'Strava autorise 200 requêtes par 15 minutes et 2 000 par jour. Chaque séance en consomme 2 à 5 : un historique complet s’étale donc sur plusieurs jours.',
    uploaded: 'envoyées',
    duplicates: 'doublons',
    failed: 'échecs',
    skipped: 'ignorées',
    doneTitle: 'Import terminé',
    stoppedTitle: 'Import interrompu',
    resumeHint: 'Relancer l’envoi reprendra les séances restantes.',
    states: {
      uploading: 'envoi…',
      uploaded: 'envoyée',
      duplicate: 'doublon',
      failed: 'échec',
      skipped: 'ignorée',
    },
  },
  mode: {
    label: 'Voie d’envoi',
    api: 'API Strava',
    apiHint:
      'Envoi automatique, mais l’accès API en tier Standard exige un abonnement Strava depuis juin 2026.',
    files: 'Fichiers à glisser (sans abonnement)',
    filesHint:
      'Génère les fichiers en lots ; l’envoi se fait par glisser-déposer sur la page d’upload de Strava. Gratuit, mais plafonné à 30 séances par jour.',
  },
  files: {
    description:
      'Les séances sont converties et rangées en lots de la taille acceptée par la page d’upload de Strava. Il n’y a plus qu’à glisser un dossier après l’autre — deux lots par jour au plus : au-delà de 30 séances, Strava refuse les envois jusqu’au lendemain.',
    format: 'Format',
    formatFit: 'FIT — porte le sport (recommandé)',
    formatTcx: 'TCX — lisible, sans le sport',
    batchSize: 'Fichiers par lot',
    batchFree: '15 — sans abonnement Strava',
    batchSubscriber: '25 — avec abonnement',
    outputDir: 'Dossier de destination',
    outputDirHint: 'Laisser vide pour écrire dans .data/export',
    tcxWarning:
      'Le TCX ne sait exprimer que « course », « vélo » ou « autre » : tous les autres sports arriveront en « Workout » et devront être corrigés à la main dans Strava. Le FIT évite ce problème.',
    export: 'Générer les fichiers',
    exporting: 'Génération en cours…',
    sessionsIn: 'séances en',
    batches: 'lots',
    written: 'fichiers écrits',
    purged: 'entrées d’un export précédent effacées',
    failed: 'échecs',
    done: 'Fichiers prêts. Envoyez un lot après l’autre, dans l’ordre, deux par jour au plus.',
    outputAt: 'Écrits dans',
    step1: 'ouvrir',
    step2: 'glisser tout le contenu d’un dossier lot-XX sur la page',
    step3: 'attendre la fin du traitement, puis passer au lot suivant',
    batchList: 'Détail des lots',
    filesShort: 'fichiers',
  },
  flags: {
    gps: 'GPS',
    heartRate: 'FC',
    noData: 'sans donnée',
    indoor: 'intérieur',
  },
};

const en: Messages = {
  app: {
    title: 'Polar → Strava',
  },
  a11y: { skipToContent: 'Skip to content' },
  theme: {
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    light: 'Light mode',
    dark: 'Dark mode',
    select: 'Theme',
    names: {
      default: 'Default',
      atelier: 'Atelier',
      blueprint: 'Blueprint',
      aurora: 'Aurora',
    },
  },
  language: { label: 'Language', toggle: 'Switch to French' },
  header: {
    subtitle:
      'Import the history that the Polar ↔ Strava sync leaves behind: read the Polar Flow export, convert to TCX, upload within Strava’s rate limits.',
  },
  steps: {
    connect: 'Strava connection',
    load: 'Polar export',
    select: 'Session selection',
    send: 'Upload',
  },
  auth: {
    description:
      'Uploading goes through the Strava API, which requires explicit authorisation. The client secret stays on the local backend and never reaches the browser.',
    optional:
      'This step is only needed for automatic upload through the API, which requires a Strava subscription. For the file route — the free one, selected by default at step 4 — go straight to step 2.',
    optionalBadge: 'optional',
    connect: 'Connect to Strava',
    disconnect: 'Disconnect',
    connectedAs: 'Connected as',
    notConnected: 'Not connected.',
    notConfigured: 'Strava application not configured.',
    notConfiguredHelp:
      'Copy .env.example to .env and fill in STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET from strava.com/settings/api. The “Authorization Callback Domain” field must be exactly: localhost',
    denied: 'Authorisation denied on Strava.',
    invalidState: 'Invalid authentication callback — please start the connection again.',
    missingScope:
      'Write permission (activity:write) was not granted, so uploading would fail. Reconnect and leave the box ticked.',
    failed: 'Token exchange with Strava failed.',
    backendDown: 'Backend unreachable — check that “npm run dev” is running.',
  },
  load: {
    description:
      'Drop the ZIP archive Polar sent you, or give its path. Nothing is modified or sent to Strava at this stage.',
    howToTitle: 'Getting the archive from Polar',
    howTo1: 'open account.polar.com and sign in',
    howTo2: 'in the left-hand menu, choose “Download your data”',
    howTo3: 'click “Download”: Polar starts collecting the archive',
    howTo4:
      'an email arrives once it is ready — the delay depends on the volume — with a link valid for two weeks',
    drop: 'Drop the .zip archive here',
    browse: 'or browse…',
    chooseFile: 'Choose the Polar export archive',
    dropHint:
      'The archive is copied into .data/upload: it never leaves your machine. Already extracted the folder? Give its path below.',
    uploading: 'Copying the archive…',
    uploaded: 'Archive copied',
    pathLabel: 'Export path',
    pathHint: '.zip archive, or a folder containing the training-session_*.json files',
    scan: 'Analyse',
    scanning: 'Analysing…',
    found: 'sessions found',
    unreadable: 'unreadable files',
    range: 'Period covered',
    withGps: 'with a GPS track',
    unusable: 'with no usable data',
    unusableHelp:
      'These sessions have no GPS, no heart rate and no distance: the resulting file would be empty and Strava would reject it. They are excluded by default.',
    error: 'Cannot read',
  },
  select: {
    description:
      'Keep only what Strava is actually missing. The date bounds let you stop before the day you linked Polar to Strava, so you do not create duplicates.',
    from: 'From',
    to: 'To',
    minDuration: 'Minimum duration (min)',
    minDurationHint: 'Filters out short commute-style rides.',
    minDistance: 'Minimum distance (km)',
    requireGps: 'Only sessions with GPS',
    includeUnusable: 'Include sessions with no data',
    sports: 'Sports',
    sportsHelp:
      'TCX can only express “running”, “biking” or “other”: the precise type is applied after upload. Adjustable per sport here.',
    sportColumn: 'Polar sport',
    countColumn: 'Sessions',
    stravaColumn: 'Strava type',
    keptColumn: 'Kept',
    kept: 'sessions kept',
    excluded: 'excluded',
    alreadySent: 'already uploaded',
    reasons: {
      'before-from': 'before the start date',
      'after-to': 'after the end date',
      'too-short': 'too short',
      'too-long': 'too long',
      'too-close': 'distance too small',
      'no-gps': 'without GPS',
      'sport-excluded': 'sport not selected',
      unusable: 'no usable data',
    },
    preview: 'Preview',
    previewMore: 'more sessions',
    empty: 'No session matches these criteria.',
  },
  send: {
    description:
      'Sessions are converted then uploaded one by one. Progress is written to disk: the import can be interrupted and will resume where it stopped.',
    applySportType: 'Fix the sport type after upload',
    applySportTypeHint:
      'Normally unnecessary: the FIT files already carry the sport. Only enable it if activities still arrive as “Workout”. Costs one extra request per session.',
    commute: 'Mark as commutes',
    redoDone: 'Re-upload sessions already processed',
    start: 'Start upload',
    stop: 'Stop',
    running: 'Uploading',
    quota: 'Strava rate limit',
    quotaShort: '15 min',
    quotaDaily: 'day',
    waiting: 'Rate limit reached — resuming in',
    estimate: 'Estimate',
    estimateHelp:
      'Strava allows 200 requests per 15 minutes and 2,000 per day. Each session uses 2 to 5, so a full history spans several days.',
    uploaded: 'uploaded',
    duplicates: 'duplicates',
    failed: 'failures',
    skipped: 'skipped',
    doneTitle: 'Import finished',
    stoppedTitle: 'Import interrupted',
    resumeHint: 'Starting again will resume with the remaining sessions.',
    states: {
      uploading: 'uploading…',
      uploaded: 'uploaded',
      duplicate: 'duplicate',
      failed: 'failed',
      skipped: 'skipped',
    },
  },
  mode: {
    label: 'Upload method',
    api: 'Strava API',
    apiHint:
      'Automatic upload, but Standard-tier API access has required a Strava subscription since June 2026.',
    files: 'Files to drag and drop (no subscription)',
    filesHint:
      'Generates the files in batches; you drag them onto Strava’s upload page yourself. Free, but capped at 30 sessions per day.',
  },
  files: {
    description:
      'Sessions are converted and grouped into batches of the size Strava’s upload page accepts. You then drag one folder after another — two batches a day at most: past 30 sessions, Strava rejects further uploads until the next day.',
    format: 'Format',
    formatFit: 'FIT — carries the sport (recommended)',
    formatTcx: 'TCX — readable, without the sport',
    batchSize: 'Files per batch',
    batchFree: '15 — without a Strava subscription',
    batchSubscriber: '25 — with a subscription',
    outputDir: 'Output folder',
    outputDirHint: 'Leave empty to write to .data/export',
    tcxWarning:
      'TCX can only express “running”, “biking” or “other”: every other sport will arrive as “Workout” and will need fixing by hand in Strava. FIT avoids this.',
    export: 'Generate files',
    exporting: 'Generating…',
    sessionsIn: 'sessions in',
    batches: 'batches',
    written: 'files written',
    purged: 'entries from a previous export removed',
    failed: 'failures',
    done: 'Files ready. Upload one batch after another, in order, two a day at most.',
    outputAt: 'Written to',
    step1: 'open',
    step2: 'drag the whole contents of a lot-XX folder onto the page',
    step3: 'wait for processing to finish, then move on to the next batch',
    batchList: 'Batch details',
    filesShort: 'files',
  },
  flags: {
    gps: 'GPS',
    heartRate: 'HR',
    noData: 'no data',
    indoor: 'indoor',
  },
};

export const messages: Record<Lang, Messages> = { fr, en };
