// Two or three exclusive options in one well, built on native radios so arrow keys and screen readers just work.

interface SegmentedChoiceProps<T extends string> {
  name: string;
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function SegmentedChoice<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: SegmentedChoiceProps<T>) {
  return (
    <fieldset>
      <legend className="text-[14px] font-medium text-ink">{legend}</legend>
      <div className="mt-1.5 inline-flex flex-wrap rounded-md bg-desk p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex h-8 cursor-pointer items-center rounded-[5px] px-3 text-[14px] text-ink-soft transition-colors duration-150 hover:text-ink has-checked:bg-paper has-checked:text-ink has-checked:ring-1 has-checked:ring-rule has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
