import type {HTMLAttributes} from "react";

interface MentionProps extends HTMLAttributes<HTMLSpanElement> {
}

export default function Mention({
  className,
  children,
  ...props
}: MentionProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-400/30 hover:bg-blue-400/60 cursor-default text-white text-sm rounded-md ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}