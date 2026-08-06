/**
 * Bouton « copier dans le presse-papiers » avec retour visuel transitoire.
 *
 * Découplé de l'i18n (libellés passés en props, avec valeurs par défaut) pour
 * rester utilisable tel quel dans Storybook. Utilise l'API Clipboard ; en cas
 * d'indisponibilité (contexte non sécurisé, refus), l'échec est silencieux et le
 * bouton ne bascule pas en état « copié ». Désactivé quand il n'y a rien à copier.
 *
 * Accessibilité : la confirmation « copié » est annoncée via une région live
 * dédiée (sr-only) plutôt que par un `aria-live` posé sur le bouton lui-même —
 * annoncer un changement de texte sur l'élément focalisé est peu fiable selon les
 * lecteurs d'écran. La région est en position absolue (sr-only) : elle n'occupe
 * pas de place dans les conteneurs flex.
 */
import { useRef, useState } from 'react';
import { Button, type ButtonProps } from './Button';

export interface CopyButtonProps extends Omit<ButtonProps, 'value' | 'children' | 'onClick'> {
  /** Texte à copier. */
  value: string;
  label?: string;
  copiedLabel?: string;
}

export function CopyButton({
  value,
  label = 'Copier',
  copiedLabel = 'Copié ✓',
  variant = 'secondary',
  size = 'sm',
  disabled,
  ...rest
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Presse-papiers indisponible : on ignore. */
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleCopy}
        disabled={disabled ?? value.length === 0}
        {...rest}
      >
        {copied ? copiedLabel : label}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </>
  );
}
