import { Tooltip } from "radix-ui";
import type {HTMLAttributes} from "react";

export interface DateTimeTextProps extends HTMLAttributes<HTMLSpanElement> {
  value: Date;
}

export default function DateTimeText({
  value,
  ...props
}: DateTimeTextProps) {
  return (
    <Tooltip.Provider delayDuration={500}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span {...props}>{value.toLocaleString()}</span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            className="select-none rounded-md bg-gray-500 px-3 py-2.5 leading-none shadow-xl text-white"
            sideOffset={5}
            side="top"
          >
            {value.toUTCString()}
            <Tooltip.Arrow className="fill-gray-500" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}