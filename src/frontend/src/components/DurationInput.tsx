import IconButton from "./IconButton.tsx";
import {BsBookmarkFill} from "react-icons/bs";
import {Select} from "radix-ui";
import SelectItem from "./SelectItem.tsx";

export type DurationValue = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type DurationPreset = {
  label: string;
  value: DurationValue;
}

export interface DurationInputProps {
  value: DurationValue;
  onChange: (value: DurationValue) => void;
  presets?: DurationPreset[];
  className?: string;
}

function normalizeDuration(val: DurationValue): DurationValue {
  let s = val.seconds;
  let m = val.minutes;
  let h = val.hours;
  let d = val.days;

  m += Math.floor(s / 60);
  s = s % 60;

  h += Math.floor(m / 60);
  m = m % 60;

  d += Math.floor(h / 24);
  h = h % 24;

  return {
    days: d,
    hours: h,
    minutes: m,
    seconds: s,
  };
}

export default function DurationInput({
  value,
  onChange,
  presets,
  className,
}: DurationInputProps) {
  const handleBlur = () => {
    onChange(normalizeDuration(value));
  };

  const renderField = (field: keyof DurationValue, shiftStep: number, shiftControlStep: number, className?: string) => (
    <input
      type="number"
      className={`input-field h-10 text-sm min-w-0 text-center ${className ?? ""}`}
      value={value?.[field] ?? 0}
      min="0"
      onChange={(e) => {
        const val = e.target.value === "" ? 0 : Number(e.target.value);
        onChange({ ...value, days: val });
      }}
      onWheel={(e) => {
        e.preventDefault();
        const isScrollingUp = e.deltaY < 0; // "up should be negative" <-- utterly deranged

        const step = e.shiftKey ? e.ctrlKey ? shiftControlStep : shiftStep : 1;
        const change = isScrollingUp ? step : -step;

        const currentValue = value?.[field] ?? 0;
        const newValue = Math.max(0, currentValue + change);

        onChange({ ...value, [field]: newValue });
      }}
    />
  );

  return (
    <div
      className={`flex flex-row justify-center items-center gap-1 container ${className ?? ""}`}
      onBlur={handleBlur}
    >
      {renderField("days", 7, 28, "flex-1")}

      <span className="flex-none text-sm text-gray-400">d</span>

      {renderField("hours", 3, 12, "basis-12")}

      <span className="flex-none text-sm text-gray-400">h</span>

      {renderField("minutes", 15, 30, "basis-12")}

      <span className="flex-none text-sm text-gray-400">m</span>

      {renderField("seconds", 15, 30, "basis-12")}

      <span className="flex-none text-sm text-gray-400">s</span>

      {presets && presets.length > 0 && (
        <Select.Root
          value={undefined}
          onValueChange={(index) => {
            onChange(presets[Number(index)]?.value ?? {});
          }
        }>
          <Select.Trigger asChild>
            <IconButton type="button" theme="default">
              <BsBookmarkFill className="size-4"/>
            </IconButton>
          </Select.Trigger>

          <Select.Portal>
            <Select.Content
              className="overflow-hidden bg-gray-700 text-white rounded-md max-h-64"
              position="popper"
              side="bottom"
              sideOffset={8}
            >
              <Select.Viewport className="p-1 size-full overflow-y-auto">
                  {presets.map((preset, index) => (
                    <SelectItem
                      key={index}
                      text={preset.label}
                      value={String(index)}
                    />
                  ))
                }
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}
    </div>
  )
}