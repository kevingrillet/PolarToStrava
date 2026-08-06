/**
 * Étape 3 — sélection des séances et correspondance des sports.
 *
 * C'est le remplaçant du `ls | awk | xargs rm` du billet de référence : mêmes
 * critères, mais non destructifs, réversibles, et surtout **motivés** — chaque
 * séance écartée l'est pour une raison affichée.
 */
import { useMemo } from 'react';
import type { Progress, SessionSummary } from '../../core/dto';
import { countByReason, filterSessions, type SessionFilter } from '../../core/filter';
import { POLAR_SPORTS, resolveSport, type StravaSportType } from '../../core/polar/sports';
import { Badge } from './ui/Badge';
import { Callout } from './ui/Callout';
import { Checkbox } from './ui/Checkbox';
import { Input } from './ui/Input';
import { Panel } from './ui/Panel';
import { Select } from './ui/Select';
import { useI18n } from '../i18n/I18nProvider';
import { formatDistance, formatDuration, formatSessionDateTime } from '../lib/format';

/** Types Strava proposés dans la liste de réaffectation, les plus utiles d'abord. */
const SPORT_TYPE_CHOICES: StravaSportType[] = [
  'Run',
  'TrailRun',
  'Ride',
  'MountainBikeRide',
  'GravelRide',
  'EBikeRide',
  'Walk',
  'Hike',
  'Swim',
  'WeightTraining',
  'Workout',
  'HighIntensityIntervalTraining',
  'Yoga',
  'Pilates',
  'Elliptical',
  'StairStepper',
  'Rowing',
  'Soccer',
  'Squash',
  'Tennis',
  'Badminton',
  'TableTennis',
  'Pickleball',
  'Racquetball',
  'AlpineSki',
  'NordicSki',
  'Snowboard',
  'Snowshoe',
  'IceSkate',
  'InlineSkate',
  'Skateboard',
  'RockClimbing',
  'Kayaking',
  'Canoeing',
  'StandUpPaddling',
  'Surfing',
  'Kitesurf',
  'Windsurf',
  'Sail',
  'Golf',
  'Wheelchair',
  'Handcycle',
  'VirtualRow',
];

const PREVIEW_LIMIT = 12;

export interface SessionSelectionProps {
  sessions: readonly SessionSummary[];
  filter: SessionFilter;
  onFilterChange: (next: SessionFilter) => void;
  sportOverrides: Readonly<Record<number, StravaSportType>>;
  onSportOverride: (sportId: number, sportType: StravaSportType) => void;
  progress: Progress;
}

export function SessionSelection({
  sessions,
  filter,
  onFilterChange,
  sportOverrides,
  onSportOverride,
  progress,
}: SessionSelectionProps) {
  const { t, lang } = useI18n();

  const { kept, excluded } = useMemo(() => filterSessions(sessions, filter), [sessions, filter]);
  const reasons = useMemo(() => countByReason(excluded), [excluded]);
  const alreadySent = useMemo(
    () =>
      kept.filter((s) => progress[s.id] !== undefined && progress[s.id].outcome !== 'failed')
        .length,
    [kept, progress],
  );

  /** Un compteur par sport présent dans l'export, trié par volume décroissant. */
  const perSport = useMemo(() => {
    const counts = new Map<number, { total: number; kept: number }>();
    for (const session of sessions) {
      const entry = counts.get(session.sportId) ?? { total: 0, kept: 0 };
      entry.total += 1;
      counts.set(session.sportId, entry);
    }
    for (const session of kept) {
      const entry = counts.get(session.sportId);
      if (entry !== undefined) entry.kept += 1;
    }
    return [...counts.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [sessions, kept]);

  const patch = (next: Partial<SessionFilter>): void => onFilterChange({ ...filter, ...next });

  /** Convertit une saisie en nombre, en traitant le champ vide comme « pas de critère ». */
  const numberOrUndefined = (raw: string, scale: number): number | undefined => {
    const value = Number.parseFloat(raw.replace(',', '.'));
    return raw.trim() === '' || Number.isNaN(value) ? undefined : value * scale;
  };

  return (
    <Panel title={`3. ${t('steps.select')}`} description={t('select.description')}>
      <div className="flex flex-col gap-5">
        {/* ---------------------------------------------------------------- */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            type="date"
            label={t('select.from')}
            value={filter.from ?? ''}
            onChange={(event) => patch({ from: event.target.value || undefined })}
          />
          <Input
            type="date"
            label={t('select.to')}
            value={filter.to ?? ''}
            onChange={(event) => patch({ to: event.target.value || undefined })}
          />
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            label={t('select.minDuration')}
            hint={t('select.minDurationHint')}
            value={filter.minDurationSeconds !== undefined ? filter.minDurationSeconds / 60 : ''}
            onChange={(event) =>
              patch({ minDurationSeconds: numberOrUndefined(event.target.value, 60) })
            }
          />
          <Input
            type="number"
            min={0}
            step="0.1"
            inputMode="decimal"
            label={t('select.minDistance')}
            value={filter.minDistanceMeters !== undefined ? filter.minDistanceMeters / 1000 : ''}
            onChange={(event) =>
              patch({ minDistanceMeters: numberOrUndefined(event.target.value, 1000) })
            }
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <Checkbox
            label={t('select.requireGps')}
            checked={filter.requireGps === true}
            onChange={(checked) => patch({ requireGps: checked ? true : undefined })}
          />
          <Checkbox
            label={t('select.includeUnusable')}
            checked={filter.excludeUnusable === false}
            onChange={(checked) => patch({ excludeUnusable: !checked })}
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            {kept.length} {t('select.kept')}
          </Badge>
          <Badge>
            {excluded.length} {t('select.excluded')}
          </Badge>
          {alreadySent > 0 && (
            <Badge variant="success">
              {alreadySent} {t('select.alreadySent')}
            </Badge>
          )}
          {Object.entries(reasons).map(([reason, count]) => (
            <Badge key={reason} variant="neutral">
              {count} {t(`select.reasons.${reason}`)}
            </Badge>
          ))}
        </div>

        {/* ------------------------- sports ------------------------------- */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-fg">{t('select.sports')}</h3>
          <p className="text-xs text-fg-muted">{t('select.sportsHelp')}</p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-md text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-fg-muted">
                  <th className="py-2 pr-3 font-medium">{t('select.sportColumn')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('select.countColumn')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('select.keptColumn')}</th>
                  <th className="py-2 font-medium">{t('select.stravaColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {perSport.map(([sportId, counts]) => {
                  const sport = resolveSport(sportId, sportOverrides);
                  return (
                    <tr key={sportId} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">
                        <span className="text-fg">{sport.label}</span>
                        {/* Un id absent du dictionnaire mérite d'être signalé :
                            c'est le seul cas où le choix Strava est un pari. */}
                        {sport.unknown && (
                          <Badge variant="warning" className="ml-2">
                            #{sportId}
                          </Badge>
                        )}
                        {sport.indoor && <Badge className="ml-2">{t('flags.indoor')}</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-fg-muted">
                        {counts.total}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-fg">{counts.kept}</td>
                      <td className="py-2">
                        <Select
                          aria-label={`${t('select.stravaColumn')} — ${sport.label}`}
                          value={sport.stravaSportType}
                          onChange={(value) => onSportOverride(sportId, value as StravaSportType)}
                          options={SPORT_TYPE_CHOICES.map((type) => ({
                            value: type,
                            label: type,
                          }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------- aperçu ------------------------------- */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-fg">{t('select.preview')}</h3>
          {kept.length === 0 ? (
            <Callout block>{t('select.empty')}</Callout>
          ) : (
            <>
              <ul className="flex flex-col gap-1">
                {kept.slice(0, PREVIEW_LIMIT).map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-subtle px-3 py-2 text-sm"
                  >
                    <span className="tabular-nums text-fg-muted">
                      {formatSessionDateTime(session.localStart, lang)}
                    </span>
                    <span className="font-medium text-fg">
                      {POLAR_SPORTS[session.sportId] ?? `#${session.sportId}`}
                    </span>
                    <span className="tabular-nums text-fg-muted">
                      {formatDuration(session.durationSeconds, lang)}
                    </span>
                    <span className="tabular-nums text-fg-muted">
                      {formatDistance(session.distanceMeters, lang)}
                    </span>
                    {session.hasGps && <Badge>{t('flags.gps')}</Badge>}
                    {session.hasHeartRate && <Badge>{t('flags.heartRate')}</Badge>}
                    {!session.usable && <Badge variant="warning">{t('flags.noData')}</Badge>}
                  </li>
                ))}
              </ul>
              {kept.length > PREVIEW_LIMIT && (
                <p className="text-xs text-fg-muted">
                  + {kept.length - PREVIEW_LIMIT} {t('select.previewMore')}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </Panel>
  );
}
