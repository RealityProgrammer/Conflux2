import type { HTMLAttributes, ReactNode } from "react";

export default function ErrorText({
  className,
  children,
  ...props
}: { children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`text-xs font-semibold text-red-500 ${className ?? ""}`} {...props}>
      {children}
    </span>
  );
}
