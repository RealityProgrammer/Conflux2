import { BsCheckLg } from "react-icons/bs";
import { Select } from "radix-ui";
import type { HTMLAttributes, ReactNode } from "react";

export interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  value: string;
  icon?: ReactNode;
}

export default function SelectItem({
  text,
  value,
  icon,
  className = "",
  ...props
}: SelectItemProps) {
  return (
    <Select.Item
      className={`dropdown-item-default flex w-full flex-row items-center gap-2 ${className}`}
      value={value}
      {...props}
    >
      {icon}

      <span className="min-w-0 flex-1 truncate py-0.5 text-left">
        <Select.ItemText>{text}</Select.ItemText>
      </span>

      <Select.ItemIndicator className="flex flex-none items-center">
        <BsCheckLg className="size-4 fill-white" />
      </Select.ItemIndicator>
    </Select.Item>
  );
}
