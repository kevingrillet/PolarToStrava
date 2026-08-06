/**
 * Setup global des tests Vitest.
 * Ajoute les matchers DOM de @testing-library/jest-dom (toBeInTheDocument, etc.)
 * et nettoie le DOM rendu après chaque test.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Selon sa version/origine, jsdom n'expose pas toujours `window.localStorage`.
// L'app (thème, langue) et ce setup s'appuient dessus : on fournit une
// implémentation minimale en mémoire quand elle est absente.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, String(value)),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
}

// jsdom n'implémente pas matchMedia : on fournit un polyfill minimal (utilisé par useTheme).
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Langue déterministe pour les tests : on force le français (sinon la langue du
// navigateur jsdom, "en-US", ferait basculer l'app en anglais).
// Garde `window` : certains tests purs s'exécutent en environnement `node`
// (ex. hachage via node:crypto) où `window` n'existe pas.
if (typeof window !== 'undefined') {
  Object.defineProperty(window.navigator, 'language', { value: 'fr-FR', configurable: true });
}

afterEach(() => {
  cleanup();
  // Évite toute fuite d'état (thème/langue) d'un test à l'autre.
  if (typeof window !== 'undefined') window.localStorage.clear();
});
