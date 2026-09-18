import type {HTMLAttributes, ReactNode} from "react";

export default function ErrorText({
  className,
  children,
  ...props
}: { children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`text-sm text-red-500 ${className ?? ''}`} {...props}>{children}</span>
  )
}