// Two or three exclusive options in one well, built on native radios so arrow keys and screen readers just work.

interface SegmentedChoiceProps<T extends string> {
  name: string;
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Keeps the legend for screen readers only, where the context already names the choice. */
  hideLegend?: boolean;
}

export function SegmentedChoice<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  hideLegend = false,
}: SegmentedChoiceProps<T>) {
  return (
    <fieldset>
      <legend className={hideLegend ? "sr-only" : "text-[15px] font-semibold text-ink"}>{legend}</legend>
      <div className={`${hideLegend ? "" : "mt-1.5 "}inline-flex flex-wrap rounded-[10px] bg-desk p-1`}>
        {options.map((option) => (
          <label
            key={option.value}
            className="flex h-9 cursor-pointer items-center rounded-lg px-3.5 text-[15px] font-medium text-ink-soft transition-colors duration-150 hover:text-ink has-checked:bg-paper has-checked:text-accent-hover has-checked:shadow-[0_1px_2px_rgb(16_52_48/0.12)] has-checked:ring-1 has-checked:ring-rule has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
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
