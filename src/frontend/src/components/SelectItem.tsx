import {BsCheck} from "react-icons/bs";
import {Select} from "radix-ui";
import type {HTMLAttributes, ReactNode} from "react";
import {TruncatedText} from "./TruncatedText.tsx";

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
      className={`dropdown-item-default flex flex-row items-center w-full gap-2 ${className}`}
      value={value}
      {...props}
    >
      {icon}

      <span className="flex-1 text-left truncate min-w-0 py-0.5">
        <Select.ItemText>{text}</Select.ItemText>
      </span>

      <Select.ItemIndicator className="flex-none flex items-center">
        <BsCheck className="fill-white size-4" />
      </Select.ItemIndicator>
    </Select.Item>
  );
}