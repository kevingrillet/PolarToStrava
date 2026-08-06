import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePersistentBoolean, useCachedState } from './useCachedState';

beforeEach(() => window.localStorage.clear());

describe('usePersistentBoolean', () => {
  it('utilise le fallback quand rien n’est stocké', () => {
    const { result } = renderHook(() => usePersistentBoolean('app:test:flag', true));
    expect(result.current[0]).toBe(true);
  });

  it('persiste la valeur et la relit au remontage', () => {
    const first = renderHook(() => usePersistentBoolean('app:test:flag'));
    act(() => first.result.current[1](true));
    expect(window.localStorage.getItem('app:test:flag')).toBe('true');

    const second = renderHook(() => usePersistentBoolean('app:test:flag'));
    expect(second.result.current[0]).toBe(true);
  });

  it('lit une valeur "false" stockée plutôt que le fallback', () => {
    window.localStorage.setItem('app:test:flag', 'false');
    const { result } = renderHook(() => usePersistentBoolean('app:test:flag', true));
    expect(result.current[0]).toBe(false);
  });
});

describe('useCachedState', () => {
  it('démarre vide quand le cache est désactivé, sans écrire', () => {
    const { result } = renderHook(() => useCachedState('app:test:val', false, ''));
    expect(result.current[0]).toBe('');
    expect(window.localStorage.getItem('app:test:val')).toBeNull();
  });

  it('écrit dans le storage tant que le cache est activé', () => {
    const { result } = renderHook(() => useCachedState('app:test:val', true, ''));
    act(() => result.current[1]('hello'));
    expect(window.localStorage.getItem('app:test:val')).toBe('hello');
  });

  it('restaure la valeur au montage si le cache était activé', () => {
    window.localStorage.setItem('app:test:val', 'restored');
    const { result } = renderHook(() => useCachedState('app:test:val', true, ''));
    expect(result.current[0]).toBe('restored');
  });

  it('ignore le storage et reste vierge si le cache est désactivé', () => {
    window.localStorage.setItem('app:test:val', 'restored');
    const { result } = renderHook(() => useCachedState('app:test:val', false, ''));
    expect(result.current[0]).toBe('');
  });

  it('supprime la valeur stockée quand le cache passe à désactivé', () => {
    window.localStorage.setItem('app:test:val', 'stale');
    const { rerender } = renderHook(({ enabled }) => useCachedState('app:test:val', enabled, ''), {
      initialProps: { enabled: true },
    });
    rerender({ enabled: false });
    expect(window.localStorage.getItem('app:test:val')).toBeNull();
  });
});
