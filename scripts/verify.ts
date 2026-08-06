/**
 * Vérification d'un export Polar, sans rien envoyer.
 *
 * Répond à la question qu'on se pose avant de lancer un import : « mon archive
 * est-elle lisible, et que va-t-il réellement partir ? ». Analyse l'export,
 * affiche la répartition par sport et par exploitabilité, puis génère quelques
 * fichiers d'exemple dans `.data/samples/`. Le FIT produit y est **relu avec le
 * décodeur officiel** : sur un format binaire, c'est la seule vérification qui ait
 * du sens.
 *
 *   npm run verify -- "C:\\…\\polar-user-data-export_….zip"
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { Decoder, Stream } from '@garmin/fitsdk';
import { DATA_DIR } from '../server/config';
import { readSessionFile, scanExport } from '../server/polarExport';
import { readSession } from '../core/polar/session';
import { POLAR_SPORTS, resolveSport } from '../core/polar/sports';
import { buildFit } from '../core/fit/build';
import { buildTcx } from '../core/tcx/build';
import type { SessionSummary } from '../core/dto';

const source = process.argv[2];
if (source === undefined || source === '') {
  process.stderr.write('usage : npm run verify -- <chemin de l’export .zip ou du dossier>\n');
  process.exit(2);
}

const started = Date.now();
const scan = await scanExport(source, (done, total) => {
  if (done === total || done % 200 === 0) process.stdout.write(`  analyse ${done}/${total}\n`);
});

process.stdout.write(`\n${scan.sessionCount} séances lues en ${Date.now() - started} ms\n`);

if (scan.errors.length > 0) {
  process.stdout.write(`\n${scan.errors.length} fichiers illisibles :\n`);
  for (const entry of scan.errors.slice(0, 10)) {
    process.stdout.write(`  ${entry.file} — ${entry.message}\n`);
  }
}

// ---------------------------------------------------------------- répartition
const bySport = new Map<number, SessionSummary[]>();
for (const session of scan.sessions) {
  const list = bySport.get(session.sportId) ?? [];
  list.push(session);
  bySport.set(session.sportId, list);
}

process.stdout.write('\nsport                             n   util.   GPS    FC  type Strava\n');
process.stdout.write(`${'-'.repeat(76)}\n`);
for (const [sportId, list] of [...bySport.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const sport = resolveSport(sportId);
  const usable = list.filter((s) => s.usable).length;
  const gps = list.filter((s) => s.hasGps).length;
  const hr = list.filter((s) => s.hasHeartRate).length;
  const label = (POLAR_SPORTS[sportId] ?? `Sport #${sportId}`).padEnd(28);
  process.stdout.write(
    `${label} ${String(list.length).padStart(5)} ${String(usable).padStart(6)} ` +
      `${String(gps).padStart(5)} ${String(hr).padStart(5)}  ${sport.stravaSportType}` +
      `${sport.unknown ? '  ⚠ id inconnu' : ''}\n`,
  );
}

const usable = scan.sessions.filter((s) => s.usable);
process.stdout.write(
  `\ntotal exploitable : ${usable.length}/${scan.sessionCount}` +
    ` (${scan.sessionCount - usable.length} sans GPS ni FC ni distance)\n`,
);

// -------------------------------------------------------- fichiers d'exemple
/**
 * Choisit des séances couvrant les chemins qui diffèrent réellement dans le
 * convertisseur : avec trace GPS, sans trace GPS, et sans donnée du tout. Trier
 * simplement par nombre de points ne garantirait pas d'en avoir une avec GPS —
 * les plus longues séances d'un corpus réel sont souvent en salle.
 */
const richest = (list: readonly SessionSummary[]): SessionSummary | undefined =>
  [...list].sort((a, b) => b.trackPoints - a.trackPoints)[0];

const samples: SessionSummary[] = [
  richest(usable.filter((s) => s.hasGps)),
  richest(usable.filter((s) => !s.hasGps)),
  scan.sessions.find((s) => !s.usable),
].filter((s): s is SessionSummary => s !== undefined);

const outDir = join(DATA_DIR, 'samples');
mkdirSync(outDir, { recursive: true });

process.stdout.write('\nFichiers générés :\n');
for (const summary of samples) {
  const session = readSession(readSessionFile(source, summary.file));
  if (session === undefined) continue;
  const tcx = buildTcx(session);
  const name = `${summary.localStart.slice(0, 10)}-${summary.sportId}-${summary.id}.tcx`;
  writeFileSync(join(outDir, name), tcx, 'utf8');

  const points = (tcx.match(/<Trackpoint>/g) ?? []).length;
  const positions = (tcx.match(/<Position>/g) ?? []).length;
  const laps = (tcx.match(/<Lap /g) ?? []).length;

  // Le FIT est le format envoyé par défaut : on le produit et surtout on le
  // **relit** avec le décodeur officiel, seule façon de vérifier un binaire.
  const fit = buildFit(session);
  const fitName = name.replace(/\.tcx$/, '.fit');
  writeFileSync(join(outDir, fitName), fit);

  const decoder = new Decoder(Stream.fromByteArray(fit));
  const integrity = decoder.checkIntegrity();
  const { messages, errors } = decoder.read({ convertDateTimesToDates: true });
  const decodedSession = (messages.sessionMesgs ?? [])[0] as
    { sport?: string; subSport?: string } | undefined;

  process.stdout.write(
    `  ${name}\n` +
      `     TCX ${(tcx.length / 1024).toFixed(0)} Ko → ${(gzipSync(Buffer.from(tcx, 'utf8')).length / 1024).toFixed(0)} Ko gz` +
      ` · ${laps} tour(s) · ${points} points · ${positions} positions` +
      ` · sport TCX ${session.exercises[0]?.sport.tcxSport ?? '—'}\n` +
      `     FIT ${(fit.length / 1024).toFixed(0)} Ko → ${(gzipSync(Buffer.from(fit)).length / 1024).toFixed(0)} Ko gz` +
      ` · intègre ${integrity ? 'oui' : 'NON'} · erreurs ${errors.length}` +
      ` · ${(messages.recordMesgs ?? []).length} points` +
      ` · sport FIT ${decodedSession?.sport ?? '—'}/${decodedSession?.subSport ?? '—'}\n`,
  );
}

process.stdout.write(`\n→ ${outDir}\n`);
