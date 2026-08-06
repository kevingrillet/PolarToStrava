/**
 * Écriture des séances sur disque, en lots prêts à glisser sur la page
 * « Upload and Sync » de Strava.
 *
 * C'est la voie **sans abonnement** : depuis juin 2026, l'accès API en tier
 * Standard exige un abonnement Strava, alors que l'import manuel de fichiers reste
 * gratuit. On produit donc les mêmes fichiers, rangés par lots de la taille
 * acceptée par la page d'upload, et l'envoi se fait à la main.
 *
 * Le FIT est le format par défaut : contrairement au TCX, il porte le sport, donc
 * une randonnée arrive bien en randonnée et non en « Workout » générique — ce qui
 * est précisément ce qu'on ne peut pas corriger sans l'API.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildFit } from '../core/fit/build';
import { buildTcx } from '../core/tcx/build';
import { readSession } from '../core/polar/session';
import { resolveSport } from '../core/polar/sports';
import { fileNameFor, planBatches } from '../core/export/batches';
import type { ExportFilesBody, ExportFormat, FileExportResult } from '../core/dto';
import { readSessionFile } from './polarExport';

export type { ExportFormat, FileExportResult };

/** Options d'export : le corps de la requête, dont `outputDir` est requis. */
export type FileExportOptions = ExportFilesBody;

/**
 * Convertit et écrit la sélection.
 *
 * Asynchrone pour rendre la main entre les lots : convertir plusieurs centaines de
 * séances est du calcul pur qui, sans cela, figerait le serveur — y compris le flux
 * de progression que l'interface écoute.
 */
export async function exportFiles(
  options: FileExportOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<FileExportResult> {
  const outputDir = resolve(options.outputDir);
  mkdirSync(outputDir, { recursive: true });

  const purged = purgePreviousExport(outputDir);
  const plan = planBatches(options.sessions, options.batchSize);
  const batches: { folder: string; files: { name: string; bytes: number }[] }[] = [];
  const errors: { file: string; message: string }[] = [];
  let written = 0;
  let totalBytes = 0;

  for (const batch of plan.batches) {
    const folder = join(outputDir, batch.folder);
    mkdirSync(folder, { recursive: true });
    const files: { name: string; bytes: number }[] = [];

    for (const summary of batch.sessions) {
      try {
        const session = readSession(
          readSessionFile(options.source, summary.file),
          options.sportOverrides,
        );
        if (session === undefined) {
          errors.push({ file: summary.file, message: 'séance illisible' });
          continue;
        }

        const sport = resolveSport(summary.sportId, options.sportOverrides);
        const name = fileNameFor(summary, sport.label, options.format);
        const content =
          options.format === 'fit' ? buildFit(session) : Buffer.from(buildTcx(session), 'utf8');

        writeFileSync(join(folder, name), content);
        files.push({ name, bytes: content.length });
        written += 1;
        totalBytes += content.length;
      } catch (error) {
        errors.push({
          file: summary.file,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    batches.push({ folder: batch.folder, files });
    onProgress?.(written, plan.sessionCount);
    await new Promise<void>((done) => setImmediate(done));
  }

  writeFileSync(join(outputDir, 'LISEZ-MOI.txt'), readmeFor(plan.batches.length, options), 'utf8');

  return {
    outputDir,
    format: options.format,
    batchSize: plan.batchSize,
    written,
    totalBytes,
    batches,
    errors,
    purged,
  };
}

/** Nom des dossiers de lot que l'on produit, et donc les seuls que l'on efface. */
const BATCH_FOLDER = /^lot-\d+$/;
const README_NAME = 'LISEZ-MOI.txt';

/**
 * Efface l'export précédent avant d'en écrire un nouveau, et renvoie le nombre
 * d'entrées supprimées.
 *
 * Sans cela, deux exports successifs se **superposent** : les fichiers d'une
 * sélection précédente restent en place, les dossiers dépassent la taille de lot
 * — et Strava refuse alors le lot entier — et l'on risque d'envoyer des séances
 * qu'on avait justement exclues.
 *
 * La purge est volontairement **chirurgicale** : on ne supprime que les dossiers
 * répondant exactement à `lot-<chiffres>` et notre propre note. Le dossier de
 * destination est choisi par l'utilisateur ; y faire un effacement récursif
 * aveugle détruirait ses fichiers s'il désigne un dossier déjà utilisé.
 */
function purgePreviousExport(outputDir: string): number {
  let removed = 0;
  for (const entry of readdirSync(outputDir, { withFileTypes: true })) {
    const isOurs =
      (entry.isDirectory() && BATCH_FOLDER.test(entry.name)) ||
      (entry.isFile() && entry.name === README_NAME);
    if (!isOurs) continue;
    rmSync(join(outputDir, entry.name), { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

/**
 * Note déposée à côté des fichiers : au moment de l'envoi, on est dans le
 * navigateur et plus dans l'application, donc la consigne doit être sur le disque.
 */
function readmeFor(batchCount: number, options: FileExportOptions): string {
  return [
    'Import de vos séances Polar dans Strava',
    '=======================================',
    '',
    `${batchCount} lot(s) de ${options.batchSize} fichiers au maximum, au format ${options.format.toUpperCase()}.`,
    '',
    'Pour chaque dossier lot-XX, dans l’ordre :',
    '',
    '  1. ouvrir https://www.strava.com/upload/select',
    '  2. glisser TOUT le contenu du dossier sur la page',
    '  3. attendre la fin du traitement, puis passer au lot suivant',
    '',
    'Points d’attention',
    '------------------',
    '',
    '- La page n’accepte que 15 fichiers à la fois sans abonnement Strava (25 avec).',
    '  Les lots sont déjà découpés à cette taille : ne pas les regrouper.',
    '- Strava plafonne aussi cette page à 30 séances par jour, soit DEUX lots de 15.',
    '  Au-delà, les envois commencent à être refusés : reprendre le lendemain au lot',
    '  suivant. Ce plafond est mesuré à l’usage, Strava ne le documente pas.',
    '- Une séance déjà présente dans Strava est détectée comme doublon et ignorée :',
    '  renvoyer un lot deux fois ne crée pas d’activités en double.',
    ...(options.format === 'tcx'
      ? [
          '',
          '- Format TCX : il ne sait exprimer que « course », « vélo » ou « autre ».',
          '  Les autres sports arriveront en « Workout » et devront être corrigés à la',
          '  main dans Strava. Le format FIT évite ce problème.',
        ]
      : []),
    '',
  ].join('\n');
}
