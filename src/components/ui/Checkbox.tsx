/**
 * Case à cocher du design system. Composant contrôlé : `onChange` renvoie
 * directement l'état booléen. Le libellé est cliquable (lié via `htmlFor`) et la
 * couleur de la coche suit le thème (`accent-color`). Sans i18n (libellé en prop).
 */
import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'checked'
> {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange, id, className, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  return (
    <label
      htmlFor={checkboxId}
      className={cx('inline-flex cursor-pointer items-center gap-2 text-sm text-fg', className)}
    >
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded-control accent-accent"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}
