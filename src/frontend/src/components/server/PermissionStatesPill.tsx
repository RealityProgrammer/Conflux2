import {RadioGroup} from "radix-ui";
import {PermissionState} from "../../graphql/types.ts";
import {FaCheck, FaMinus, FaXmark} from "react-icons/fa6";

export interface PermissionStatesPillProps {
  value?: PermissionState;
  onValueChange?: (value: PermissionState) => void;
  disabled?: boolean;
}

export default function PermissionStatesPill({
  value,
  onValueChange,
  disabled,
}: PermissionStatesPillProps) {
  return (
    <RadioGroup.Root
      className="inline-flex bg-none rounded-lg p-1 gap-1 border border-gray-550 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
      value={value}
      onValueChange={onValueChange}
      defaultValue="inherit"
      aria-label="Permission settings"
      disabled={disabled}
    >
      <RadioGroup.Item
        value="disable"
        aria-label="Disable"
        className="group relative flex p-1 items-center justify-center rounded-sm transition-colors duration-200 hover-highlight"
      >
        <FaXmark className="size-4 text-red-500 transition-all duration-200 group-data-[state=unchecked]:opacity-50 group-data-[state=unchecked]:scale-90 group-hover:opacity-80 group-data-[state=checked]:opacity-100 group-data-[state=checked]:scale-110"/>
      </RadioGroup.Item>

      <RadioGroup.Item
        value="inherit"
        aria-label="Inherit"
        className="group relative flex p-1 items-center justify-center rounded-sm transition-colors duration-200 hover-highlight"
      >
        <FaMinus className="size-4 text-zinc-400 transition-all duration-200 group-data-[state=unchecked]:opacity-50 group-data-[state=unchecked]:scale-90 group-hover:opacity-80 group-data-[state=checked]:opacity-100 group-data-[state=checked]:scale-110"/>
      </RadioGroup.Item>

      <RadioGroup.Item
        value="enable"
        aria-label="Enable"
        className="group relative flex p-1 items-center justify-center rounded-sm transition-colors duration-200 hover-highlight"
      >
        <FaCheck className="size-4 text-green-500 transition-all duration-200 group-data-[state=unchecked]:opacity-50 group-data-[state=unchecked]:scale-90 group-hover:opacity-80 group-data-[state=checked]:opacity-100 group-data-[state=checked]:scale-110"/>
      </RadioGroup.Item>
    </RadioGroup.Root>
  );
}