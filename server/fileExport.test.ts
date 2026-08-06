import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionSummary } from '../core/dto';
import { OUTDOOR_RIDE_JSON } from '../core/polar/fixtures';
import { exportFiles } from './fileExport';

/**
 * L'export de fichiers est testé sur un vrai système de fichiers, dans un dossier
 * temporaire : c'est précisément la couche fichiers qui a produit un bug — deux
 * exports successifs se superposaient, donnant des lots de 16 fichiers que Strava
 * aurait refusés.
 *
 * La source est un **dossier** de fichiers JSON plutôt qu'une archive : `exportFiles`
 * accepte les deux, et cela évite de fabriquer un ZIP pour le test.
 */
let sourceDir: string;
let outputDir: string;

/** Écrit `count` séances dans le dossier source et renvoie leurs résumés. */
function makeSessions(count: number): SessionSummary[] {
  const sessions: SessionSummary[] = [];
  for (let index = 0; index < count; index += 1) {
    const day = String((index % 28) + 1).padStart(2, '0');
    const localStart = `2020-01-${day}T0${index % 10}:00:00`;
    const id = `${1000 + index}`;
    const file = `training-session_${localStart.replace(/:/g, '-')}_${id}.json`;
    // Le contenu importe peu ici : seule la mécanique de découpage et d'écriture
    // est sous test, la conversion l'étant déjà dans `core/`.
    writeFileSync(join(sourceDir, file), OUTDOOR_RIDE_JSON, 'utf8');
    sessions.push({
      id,
      file,
      startedAt: Date.parse(`${localStart}Z`) + index,
      localStart,
      durationSeconds: 3600,
      sportId: 2,
      hasGps: true,
      hasHeartRate: true,
      usable: true,
      trackPoints: 5,
    });
  }
  return sessions;
}

function countPerBatch(dir: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) counts[entry.name] = readdirSync(join(dir, entry.name)).length;
  }
  return counts;
}

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'polar-to-strava-'));
  sourceDir = join(root, 'source');
  outputDir = join(root, 'out');
  mkdirSync(sourceDir, { recursive: true });
});

afterEach(() => {
  rmSync(join(sourceDir, '..'), { recursive: true, force: true });
});

describe('exportFiles', () => {
  it('respecte exactement la taille de lot', async () => {
    const sessions = makeSessions(32);
    const result = await exportFiles({
      source: sourceDir,
      sessions,
      sportOverrides: {},
      format: 'fit',
      batchSize: 15,
      outputDir,
    });

    expect(result.written).toBe(32);
    expect(result.errors).toEqual([]);
    // Aucun dossier ne doit dépasser 15 : au-delà, Strava refuse le lot entier.
    expect(countPerBatch(outputDir)).toEqual({ 'lot-01': 15, 'lot-02': 15, 'lot-03': 2 });
  });

  it('écrit une note à côté des lots, et non dedans', async () => {
    await exportFiles({
      source: sourceDir,
      sessions: makeSessions(3),
      sportOverrides: {},
      format: 'fit',
      batchSize: 15,
      outputDir,
    });
    expect(readdirSync(outputDir).sort()).toEqual(['LISEZ-MOI.txt', 'lot-01']);
    expect(readdirSync(join(outputDir, 'lot-01'))).toHaveLength(3);
  });

  it('purge l’export précédent au lieu de s’y superposer', async () => {
    // 32 séances → 3 lots.
    await exportFiles({
      source: sourceDir,
      sessions: makeSessions(32),
      sportOverrides: {},
      format: 'fit',
      batchSize: 15,
      outputDir,
    });
    expect(Object.keys(countPerBatch(outputDir))).toHaveLength(3);

    // Puis une sélection plus petite et différente dans le MÊME dossier.
    const smaller = makeSessions(20).slice(5, 12);
    const second = await exportFiles({
      source: sourceDir,
      sessions: smaller,
      sportOverrides: {},
      format: 'fit',
      batchSize: 15,
      outputDir,
    });

    expect(second.written).toBe(7);
    // Sans purge, lot-01 contiendrait les 15 fichiers précédents PLUS les nouveaux.
    expect(countPerBatch(outputDir)).toEqual({ 'lot-01': 7 });
    expect(second.purged).toBeGreaterThan(0);
  });

  it('ne touche pas aux fichiers étrangers du dossier de destination', async () => {
    // Le dossier de sortie est choisi par l'utilisateur : une purge récursive
    // aveugle détruirait ses fichiers.
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, 'mes-notes.txt'), 'à garder', 'utf8');
    mkdirSync(join(outputDir, 'photos'), { recursive: true });
    writeFileSync(join(outputDir, 'photos', 'a.jpg'), 'x', 'utf8');

    await exportFiles({
      source: sourceDir,
      sessions: makeSessions(2),
      sportOverrides: {},
      format: 'fit',
      batchSize: 15,
      outputDir,
    });

    expect(readdirSync(outputDir).sort()).toEqual([
      'LISEZ-MOI.txt',
      'lot-01',
      'mes-notes.txt',
      'photos',
    ]);
    expect(readdirSync(join(outputDir, 'photos'))).toEqual(['a.jpg']);
  });

  it('produit des fichiers TCX quand le format le demande', async () => {
    await exportFiles({
      source: sourceDir,
      sessions: makeSessions(2),
      sportOverrides: {},
      format: 'tcx',
      batchSize: 15,
      outputDir,
    });
    const files = readdirSync(join(outputDir, 'lot-01'));
    expect(files.every((name) => name.endsWith('.tcx'))).toBe(true);
  });

  it('signale les séances illisibles sans interrompre le lot', async () => {
    const sessions = makeSessions(3);
    // On supprime le fichier source de la deuxième séance.
    rmSync(join(sourceDir, sessions[1].file));

    const result = await exportFiles({
      source: sourceDir,
      sessions,
      sportOverrides: {},
      format: 'fit',
      batchSize: 15,
      outputDir,
    });

    expect(result.written).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe(sessions[1].file);
  });
});
