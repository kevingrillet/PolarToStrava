/**
 * Champ de saisie texte du design system, avec libellé, indication (hint) et
 * message d'erreur optionnels — câblés pour l'accessibilité :
 *  - `<label htmlFor>` lié à l'input (toujours présent si `label` est fourni) ;
 *  - `aria-describedby` pointant vers le hint et/ou l'erreur ;
 *  - `aria-invalid` quand une erreur est présente.
 *
 * Étend les attributs natifs de `<input>`. L'`id` est généré (ou repris s'il est
 * passé en prop).
 */
import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Texte d'aide affiché sous le champ. */
  hint?: string;
  /** Message d'erreur ; passe le champ en état invalide. */
  error?: string;
}

export function Input({ label, hint, error, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'h-10 w-full rounded-control border bg-input px-3 text-sm text-fg placeholder:text-fg-muted',
          error && 'border-danger',
          className,
        )}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
