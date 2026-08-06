/**
 * Contrat d'échange entre le backend et l'interface.
 *
 * Ces types vivent dans `core/` — et non dans `server/` — pour être la **seule**
 * définition partagée par les deux côtés : le front consomme exactement ce que le
 * serveur produit, et une divergence devient une erreur de compilation plutôt
 * qu'un bug d'exécution.
 */
import type { StravaSportType } from './polar/sports';

/**
 * Résumé d'une séance, suffisant pour l'affichage et le filtrage. La piste
 * complète (jusqu'à 24 000 points) n'est reconstruite qu'au moment de générer
 * le TCX, côté serveur.
 */
export interface SessionSummary {
  readonly id: string;
  /** Nom du fichier dans l'export — clé pour relire la séance. */
  readonly file: string;
  readonly startedAt: number;
  readonly localStart: string;
  readonly durationSeconds: number;
  readonly distanceMeters?: number;
  readonly calories?: number;
  readonly sportId: number;
  readonly name?: string;
  readonly deviceModel?: string;
  /** `Polar Flow` (montre) ou `Polar Connect` (saisie manuelle / synchro tierce). */
  readonly application?: string;
  readonly hasGps: boolean;
  readonly hasHeartRate: boolean;
  readonly usable: boolean;
  readonly trackPoints: number;
}

export interface ScanResult {
  readonly source: string;
  readonly sessionCount: number;
  readonly sessions: readonly SessionSummary[];
  /** Fichiers qu'on n'a pas su lire, avec la raison. */
  readonly errors: readonly { readonly file: string; readonly message: string }[];
}

/** Issue d'un envoi, mémorisée pour ne pas retenter ce qui est acquis. */
export type UploadOutcome = 'uploaded' | 'duplicate' | 'failed';

export interface UploadRecord {
  readonly outcome: UploadOutcome;
  readonly activityId?: number;
  readonly error?: string;
  readonly at: string;
}

/** Journal des envois, indexé par identifiant de séance Polar. */
export type Progress = Record<string, UploadRecord>;

export interface QuotaState {
  readonly shortLimit: number;
  readonly dailyLimit: number;
  readonly shortUsage: number;
  readonly dailyUsage: number;
  readonly blockedUntil?: number;
}

/** Événements diffusés pendant un import (Server-Sent Events). */
export type RunEvent =
  | { readonly type: 'start'; readonly total: number }
  | {
      readonly type: 'session';
      readonly index: number;
      readonly total: number;
      readonly sessionId: string;
      readonly file: string;
      readonly state: 'uploading' | UploadOutcome | 'skipped';
      readonly activityId?: number;
      readonly error?: string;
    }
  | {
      readonly type: 'quota';
      readonly shortUsage: number;
      readonly shortLimit: number;
      readonly dailyUsage: number;
      readonly dailyLimit: number;
    }
  | { readonly type: 'waiting'; readonly untilMs: number; readonly reason: 'quota' }
  | {
      readonly type: 'done';
      readonly uploaded: number;
      readonly duplicates: number;
      readonly failed: number;
      readonly skipped: number;
      readonly stopped: boolean;
    };

export interface RunState {
  readonly running: boolean;
  readonly total: number;
  readonly index: number;
  readonly uploaded: number;
  readonly duplicates: number;
  readonly failed: number;
  readonly skipped: number;
}

export interface AuthStatus {
  readonly connected: boolean;
  readonly athlete?: { readonly id: number; readonly name: string };
  readonly expiresAt?: number;
  readonly error?: string;
}

export interface ServerConfig {
  readonly stravaConfigured: boolean;
  readonly redirectUri: string;
}

/** Corps de `POST /api/upload/start`. */
export interface StartUploadBody {
  readonly source: string;
  readonly sessions: readonly SessionSummary[];
  readonly sportOverrides: Readonly<Record<number, StravaSportType>>;
  readonly format: ExportFormat;
  readonly applySportType: boolean;
  readonly commute: boolean;
  readonly redoDone: boolean;
}

/**
 * Format des fichiers produits. Le FIT porte le sport, le TCX non — ce dernier
 * n'est conservé que comme repli lisible, utile au diagnostic.
 */
export type ExportFormat = 'fit' | 'tcx';

/** Corps de `POST /api/export/files`. */
export interface ExportFilesBody {
  readonly source: string;
  readonly sessions: readonly SessionSummary[];
  readonly sportOverrides: Readonly<Record<number, StravaSportType>>;
  readonly format: ExportFormat;
  /** 15 fichiers par lot sans abonnement Strava, 25 avec. */
  readonly batchSize: number;
  readonly outputDir: string;
}

export interface FileExportResult {
  readonly outputDir: string;
  readonly format: ExportFormat;
  readonly batchSize: number;
  readonly written: number;
  readonly totalBytes: number;
  readonly batches: readonly {
    readonly folder: string;
    readonly files: readonly { readonly name: string; readonly bytes: number }[];
  }[];
  readonly errors: readonly { readonly file: string; readonly message: string }[];
  /**
   * Nombre d'entrées d'un export précédent effacées avant celui-ci. Affiché :
   * un dossier réutilisé sans purge produirait des lots dépassant la limite de
   * Strava, et enverrait des séances exclues depuis.
   */
  readonly purged: number;
}
