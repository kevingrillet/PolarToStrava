/**
 * Renvoie une version « retardée » d'une valeur : elle ne se met à jour qu'après
 * `delay` ms sans changement. Sert à éviter qu'un calcul lourd (filtrage, parsing,
 * rendu) ne se relance à chaque frappe sur le thread UI : la saisie reste fluide
 * (l'état immédiat alimente le champ), le calcul ne suit que la valeur stabilisée.
 */
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
