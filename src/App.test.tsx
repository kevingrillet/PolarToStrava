import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { stubBackend, stubBackendDown } from './test/stubBackend';

beforeEach(() => {
  stubBackend();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('affiche le titre et les deux premières étapes', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Polar → Strava', level: 1 })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: '1. Connexion Strava', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. Export Polar', level: 2 })).toBeInTheDocument();
  });

  it('expose les contrôles de thème et de langue', () => {
    render(<App />);
    expect(screen.getByRole('combobox', { name: 'Thème' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Passer en anglais' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activer le mode sombre' })).toBeInTheDocument();
  });

  it("affiche l'athlète connecté et permet de se déconnecter", async () => {
    render(<App />);
    expect(await screen.findByText('Kevin Grillet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
  });

  it('propose de se connecter quand Strava ne l’est pas', async () => {
    stubBackend((path) => (path === '/api/auth/status' ? { connected: false } : undefined));
    render(<App />);
    expect(await screen.findByRole('link', { name: 'Se connecter à Strava' })).toBeInTheDocument();
  });

  it('signale une application Strava non configurée', async () => {
    stubBackend((path) =>
      path === '/api/config'
        ? { stravaConfigured: false, redirectUri: '' }
        : path === '/api/auth/status'
          ? { connected: false }
          : undefined,
    );
    render(<App />);
    expect(await screen.findByText(/Authorization Callback Domain/)).toBeInTheDocument();
  });

  it('signale un backend injoignable', async () => {
    stubBackendDown();
    render(<App />);
    expect(await screen.findByText(/Backend injoignable/)).toBeInTheDocument();
  });

  it('propose la voie « fichiers » par défaut, celle qui ne demande pas d’abonnement', async () => {
    stubBackend((path) =>
      path === '/api/export/scan'
        ? {
            source: 'export.zip',
            sessionCount: 1,
            errors: [],
            sessions: [
              {
                id: '1',
                file: 'training-session_2020-01-01T10-00-00_1.json',
                startedAt: Date.parse('2020-01-01T10:00:00Z'),
                localStart: '2020-01-01T10:00:00',
                durationSeconds: 3600,
                sportId: 11,
                hasGps: true,
                hasHeartRate: true,
                usable: true,
                trackPoints: 100,
              },
            ],
          }
        : undefined,
    );
    render(<App />);

    await userEvent.type(screen.getByLabelText('Chemin de l’export'), 'export.zip');
    await userEvent.click(screen.getByRole('button', { name: 'Analyser' }));

    // L'étape 4 apparaît, en mode fichiers, avec le FIT présélectionné.
    expect(await screen.findByRole('heading', { name: '4. Envoi' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Voie d’envoi' })).toHaveValue('files');
    expect(screen.getByRole('button', { name: 'Générer les fichiers' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Format' })).toHaveValue('fit');
  });

  it('n’affiche les étapes 3 et 4 qu’après analyse d’un export', () => {
    render(<App />);
    expect(
      screen.queryByRole('heading', { name: /Sélection des séances/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^4\./ })).not.toBeInTheDocument();
  });

  it("désactive l'analyse tant qu'aucun chemin n'est saisi", () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Analyser' })).toBeDisabled();
  });
});
