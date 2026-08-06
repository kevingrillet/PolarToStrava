/**
 * Lecture d'un export Polar Flow, au choix depuis l'archive ZIP telle que Polar
 * l'envoie, ou depuis un dossier déjà décompressé.
 *
 * Deux contraintes ont façonné ce module :
 *
 * 1. **Volume.** Une archive réelle fait ~50 Mo compressés pour 3 157 entrées,
 *    dont 726 séances qui pèsent ~200 Mo décompressées (jusqu'à 8 Mo l'unité
 *    pour une sortie de 6 h). On ne décompresse donc jamais tout d'un bloc : on
 *    liste d'abord (sans décompresser), puis on traite par lots en ne conservant
 *    qu'un résumé par séance.
 * 2. **Coût du scan.** Analyser les 726 fichiers prend plusieurs secondes ; le
 *    résultat est donc mis en cache sur disque, invalidé sur la taille et la date
 *    de modification de l'archive.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { unzipSync, type UnzipFileInfo } from 'fflate';
import { normalizeSession, type NormalizedSession } from '../core/polar/session';
import { parsePolarJson } from '../core/polar/json';
import type { ScanResult, SessionSummary } from '../core/dto';
import { DATA_DIR } from './config';

export type { ScanResult, SessionSummary };

/** Les séances d'entraînement, seuls fichiers qui nous intéressent dans l'export. */
const SESSION_PREFIX = 'training-session';

/** Nombre de séances décompressées simultanément. Borne l'empreinte mémoire. */
const BATCH_SIZE = 40;

function summarize(file: string, session: NormalizedSession): SessionSummary {
  return {
    id: session.id,
    file,
    startedAt: session.startedAt,
    localStart: session.localStart,
    durationSeconds: session.durationSeconds,
    ...(session.distanceMeters !== undefined ? { distanceMeters: session.distanceMeters } : {}),
    ...(session.calories !== undefined ? { calories: session.calories } : {}),
    sportId: session.sport.id,
    ...(session.name !== undefined ? { name: session.name } : {}),
    ...(session.deviceModel !== undefined ? { deviceModel: session.deviceModel } : {}),
    ...(session.application !== undefined ? { application: session.application } : {}),
    hasGps: session.hasGps,
    hasHeartRate: session.hasHeartRate,
    usable: session.usable,
    trackPoints: session.exercises.reduce((total, ex) => total + ex.track.length, 0),
  };
}

// ---------------------------------------------------------------------------
// Source : archive ZIP
// ---------------------------------------------------------------------------

const decoder = new TextDecoder('utf-8');

function isSessionEntry(name: string): boolean {
  // `name` peut être préfixé d'un dossier selon la façon dont l'archive a été
  // produite : on ne regarde donc que le dernier segment.
  const base = name.slice(name.lastIndexOf('/') + 1);
  return base.startsWith(SESSION_PREFIX) && base.endsWith('.json');
}

/**
 * Liste les séances d'une archive **sans rien décompresser** : le filtre de
 * fflate est consulté avant l'inflation, donc renvoyer `false` systématiquement
 * ne coûte qu'une lecture du répertoire central du ZIP.
 */
function listZipSessions(zip: Uint8Array): string[] {
  const names: string[] = [];
  unzipSync(zip, {
    filter: (info: UnzipFileInfo) => {
      if (isSessionEntry(info.name)) names.push(info.name);
      return false;
    },
  });
  return names;
}

/** Décompresse un lot précis d'entrées et renvoie leur contenu texte. */
function readZipBatch(zip: Uint8Array, names: readonly string[]): Map<string, string> {
  const wanted = new Set(names);
  const files = unzipSync(zip, { filter: (info) => wanted.has(info.name) });
  const out = new Map<string, string>();
  for (const [name, bytes] of Object.entries(files)) out.set(name, decoder.decode(bytes));
  return out;
}

// ---------------------------------------------------------------------------
// Cache de scan
// ---------------------------------------------------------------------------

function cachePathFor(source: string): string {
  const stat = statSync(source);
  // La signature inclut taille et date de modification : remplacer l'archive
  // par un export plus récent invalide le cache automatiquement.
  const key = createHash('sha256')
    .update(`${resolve(source)}|${stat.size}|${stat.mtimeMs}`)
    .digest('hex')
    .slice(0, 16);
  return join(DATA_DIR, `scan-${key}.json`);
}

function readCache(source: string): ScanResult | undefined {
  try {
    return JSON.parse(readFileSync(cachePathFor(source), 'utf8')) as ScanResult;
  } catch {
    return undefined;
  }
}

function writeCache(source: string, result: ScanResult): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(cachePathFor(source), JSON.stringify(result), 'utf8');
  } catch {
    /* Le cache est un confort : son échec ne doit pas faire échouer le scan. */
  }
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Rend la main à la boucle d'événements, pour ne pas figer le serveur. */
const yieldToEventLoop = (): Promise<void> => new Promise((done) => setImmediate(done));

/**
 * Analyse un export et renvoie le résumé de chaque séance.
 *
 * Asynchrone à dessein : analyser 726 séances prend plusieurs secondes de calcul
 * pur. Sans rendre la main entre les lots, le serveur cesserait de répondre
 * pendant tout le scan — y compris au flux de progression que l'interface écoute.
 *
 * `onProgress` est appelé à chaque lot.
 */
export async function scanExport(
  source: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ScanResult> {
  const cached = readCache(source);
  if (cached !== undefined) {
    onProgress?.(cached.sessionCount, cached.sessionCount);
    return cached;
  }

  const sessions: SessionSummary[] = [];
  const errors: { file: string; message: string }[] = [];

  const consume = (file: string, text: string): void => {
    try {
      const normalized = normalizeSession(parsePolarJson(text));
      if (normalized === undefined) {
        errors.push({ file, message: 'séance sans date de départ exploitable' });
        return;
      }
      sessions.push(summarize(file, normalized));
    } catch (error) {
      errors.push({ file, message: error instanceof Error ? error.message : String(error) });
    }
  };

  if (isDirectory(source)) {
    const names = readdirSync(source).filter(isSessionEntry);
    for (let index = 0; index < names.length; index += 1) {
      consume(names[index], readFileSync(join(source, names[index]), 'utf8'));
      if ((index + 1) % BATCH_SIZE === 0) {
        onProgress?.(index + 1, names.length);
        await yieldToEventLoop();
      }
    }
    onProgress?.(names.length, names.length);
  } else {
    const zip = new Uint8Array(readFileSync(source));
    const names = listZipSessions(zip);
    for (let offset = 0; offset < names.length; offset += BATCH_SIZE) {
      const batch = names.slice(offset, offset + BATCH_SIZE);
      for (const [name, text] of readZipBatch(zip, batch)) consume(name, text);
      onProgress?.(Math.min(offset + BATCH_SIZE, names.length), names.length);
      await yieldToEventLoop();
    }
  }

  sessions.sort((a, b) => a.startedAt - b.startedAt);
  const result: ScanResult = {
    source,
    sessionCount: sessions.length,
    sessions,
    errors,
  };
  writeCache(source, result);
  return result;
}

/** Relit une séance complète (piste incluse) pour la convertir en TCX. */
export function readSessionFile(source: string, file: string): string {
  if (isDirectory(source)) return readFileSync(join(source, file), 'utf8');
  const zip = new Uint8Array(readFileSync(source));
  const files = unzipSync(zip, { filter: (info) => info.name === file });
  const bytes = files[file];
  if (bytes === undefined) throw new Error(`entrée introuvable dans l'archive : ${file}`);
  return decoder.decode(bytes);
}
