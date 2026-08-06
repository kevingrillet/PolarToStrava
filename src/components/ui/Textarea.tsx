/**
 * Zone de texte multiligne du design system — pendant de `Input` pour les
 * contenus longs (entrée/sortie des outils). Mêmes conventions d'accessibilité :
 * `<label htmlFor>`, `aria-describedby` (hint/erreur), `aria-invalid`.
 */
import { useId, type TextareaHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, id, rows = 8, className, ...rest }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'w-full resize-y rounded-control border bg-input px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-muted',
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
