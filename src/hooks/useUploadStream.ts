/**
 * Abonnement au flux de progression de l'import (Server-Sent Events).
 *
 * `EventSource` se reconnecte tout seul en cas de coupure, ce qui compte ici :
 * un import s'étale sur des heures, entrecoupé d'attentes de quota pouvant
 * atteindre plusieurs dizaines de minutes.
 *
 * L'état affiché est reconstruit à partir des événements reçus, mais il est
 * d'abord **initialisé depuis le serveur** : ouvrir l'interface au milieu d'un
 * import en cours doit montrer sa progression, pas un écran vierge.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuotaState, RunEvent, RunState } from '../../core/dto';

/** Nombre de lignes de journal conservées à l'écran. */
const LOG_LIMIT = 200;

const IDLE_STATE: RunState = {
  running: false,
  total: 0,
  index: 0,
  uploaded: 0,
  duplicates: 0,
  failed: 0,
  skipped: 0,
};

export interface UploadStream {
  readonly state: RunState;
  readonly quota: QuotaState | undefined;
  /** Journal, du plus récent au plus ancien. */
  readonly log: readonly RunEvent[];
  readonly waitingUntil: number | undefined;
  readonly finished: Extract<RunEvent, { type: 'done' }> | undefined;
  /** Remet le suivi à zéro avant de relancer un import. */
  readonly reset: () => void;
}

export interface UploadStreamOptions {
  /** Appelé quand un import se termine — sert à relire le journal de reprise. */
  readonly onFinished?: () => void;
}

export function useUploadStream({ onFinished }: UploadStreamOptions = {}): UploadStream {
  const [state, setState] = useState<RunState>(IDLE_STATE);
  const [quota, setQuota] = useState<QuotaState>();
  const [log, setLog] = useState<readonly RunEvent[]>([]);
  const [waitingUntil, setWaitingUntil] = useState<number>();
  const [finished, setFinished] = useState<Extract<RunEvent, { type: 'done' }>>();

  // Les compteurs sont tenus dans une ref : plusieurs événements peuvent arriver
  // dans le même tick, et lire l'état précédent via le setter suffirait mais
  // rendrait la logique d'agrégation illisible.
  const counters = useRef<RunState>(IDLE_STATE);

  // Le rappel passe par une ref pour que l'abonnement SSE reste monté une seule
  // fois : le refermer et le rouvrir à chaque rendu perdrait des événements. La
  // ref est mise à jour dans un effet, jamais pendant le rendu.
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const reset = useCallback(() => {
    counters.current = IDLE_STATE;
    setState(IDLE_STATE);
    setLog([]);
    setWaitingUntil(undefined);
    setFinished(undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Reprise d'un import déjà lancé (rechargement de page, second onglet).
    void fetch('/api/upload/state')
      .then((response) => (response.ok ? response.json() : undefined))
      .then((initial: (RunState & { quota?: QuotaState }) | undefined) => {
        if (cancelled || initial === undefined) return;
        const { quota: initialQuota, ...runState } = initial;
        counters.current = runState;
        setState(runState);
        if (initialQuota !== undefined) setQuota(initialQuota);
      })
      .catch(() => {
        /* Backend absent : l'interface reste utilisable, l'envoi seul échouera. */
      });

    const source = new EventSource('/api/upload/events');

    source.onmessage = (raw: MessageEvent<string>) => {
      const event = JSON.parse(raw.data) as RunEvent;

      switch (event.type) {
        case 'start':
          counters.current = { ...IDLE_STATE, running: true, total: event.total };
          setState(counters.current);
          setFinished(undefined);
          setWaitingUntil(undefined);
          break;

        case 'session': {
          const next: RunState = {
            ...counters.current,
            running: true,
            index: event.index,
            total: event.total,
            uploaded: counters.current.uploaded + (event.state === 'uploaded' ? 1 : 0),
            duplicates: counters.current.duplicates + (event.state === 'duplicate' ? 1 : 0),
            failed: counters.current.failed + (event.state === 'failed' ? 1 : 0),
            skipped: counters.current.skipped + (event.state === 'skipped' ? 1 : 0),
          };
          counters.current = next;
          setState(next);
          // Une séance qui aboutit met fin à l'attente de quota affichée.
          if (event.state !== 'uploading') setWaitingUntil(undefined);
          setLog((current) => [event, ...current].slice(0, LOG_LIMIT));
          break;
        }

        case 'quota':
          setQuota({
            shortLimit: event.shortLimit,
            dailyLimit: event.dailyLimit,
            shortUsage: event.shortUsage,
            dailyUsage: event.dailyUsage,
          });
          break;

        case 'waiting':
          setWaitingUntil(event.untilMs);
          break;

        case 'done':
          counters.current = { ...counters.current, running: false };
          setState(counters.current);
          setFinished(event);
          setWaitingUntil(undefined);
          onFinishedRef.current?.();
          break;
      }
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  return { state, quota, log, waitingUntil, finished, reset };
}
