/**
 * Liste déroulante du design system — un `<select>` natif (accessible clavier
 * d'emblée), libellé optionnel lié via `<label>`. Composant contrôlé : `onChange`
 * renvoie directement la valeur (string).
 *
 * Les `<option>` reçoivent un fond opaque (`--color-canvas`) : sans ça, certains
 * navigateurs peignent la liste avec le fond translucide du select sur les thèmes
 * « verre » (aurora), rendant le texte illisible (même correctif que ThemeSelector).
 */
import { useId, type SelectHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'onChange' | 'value'
> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

export function Select({ label, value, onChange, options, id, className, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-fg">
          {label}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cx(
          'h-10 cursor-pointer rounded-control border bg-surface px-2 text-sm font-medium text-fg transition hover:bg-subtle [&>option]:bg-canvas [&>option]:text-fg',
          className,
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
