import { RadioGroup } from "radix-ui";
import { PermissionState } from "../../graphql/types.ts";
import { FaCheck, FaMinus, FaXmark } from "react-icons/fa6";

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
      className="border-gray-550 inline-flex gap-1 rounded-lg border bg-none p-1 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-75"
      value={value}
      onValueChange={onValueChange}
      defaultValue={PermissionState.Inherit}
      aria-label="Permission settings"
      disabled={disabled}
    >
      <RadioGroup.Item
        value={PermissionState.Disable}
        className="group hover-highlight relative flex items-center justify-center rounded-sm p-1 transition-colors duration-200"
      >
        <FaXmark className="size-4 text-red-500 transition-all duration-200 group-hover:opacity-80 group-data-[state=checked]:scale-120 group-data-[state=checked]:opacity-100 group-data-[state=unchecked]:scale-80 group-data-[state=unchecked]:opacity-50" />
      </RadioGroup.Item>

      <RadioGroup.Item
        value={PermissionState.Inherit}
        className="group hover-highlight relative flex items-center justify-center rounded-sm p-1 transition-colors duration-200"
      >
        <FaMinus className="size-4 text-zinc-400 transition-all duration-200 group-hover:opacity-80 group-data-[state=checked]:scale-120 group-data-[state=checked]:opacity-100 group-data-[state=unchecked]:scale-80 group-data-[state=unchecked]:opacity-50" />
      </RadioGroup.Item>

      <RadioGroup.Item
        value={PermissionState.Enable}
        className="group hover-highlight relative flex items-center justify-center rounded-sm p-1 transition-colors duration-200"
      >
        <FaCheck className="size-4 text-green-500 transition-all duration-200 group-hover:opacity-80 group-data-[state=checked]:scale-120 group-data-[state=checked]:opacity-100 group-data-[state=unchecked]:scale-80 group-data-[state=unchecked]:opacity-50" />
      </RadioGroup.Item>
    </RadioGroup.Root>
  );
}
