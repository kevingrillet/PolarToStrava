import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n } from './I18nProvider';
import App from '../App';
import { stubBackend } from '../test/stubBackend';

describe('i18n - fonction de traduction', () => {
  it('résout une clé existante en français par défaut', () => {
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    expect(result.current.t('steps.connect')).toBe('Connexion Strava');
    expect(result.current.t('theme.select')).toBe('Thème');
  });

  it('résout une clé imbriquée sur deux niveaux', () => {
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    expect(result.current.t('select.reasons.too-short')).toBe('trop courtes');
  });

  it('renvoie la clé telle quelle si elle est inconnue', () => {
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    expect(result.current.t('clef.inexistante')).toBe('clef.inexistante');
  });
});

describe('i18n - intégration dans App', () => {
  beforeEach(() => {
    stubBackend();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('affiche le français par défaut', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: '1. Connexion Strava' })).toBeInTheDocument();
  });

  it("bascule toute l'interface en anglais", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Passer en anglais' }));

    expect(screen.getByRole('heading', { name: '1. Strava connection' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. Polar export' })).toBeInTheDocument();
    expect(screen.getByText(/Strava’s rate limits/)).toBeInTheDocument();
  });
});
