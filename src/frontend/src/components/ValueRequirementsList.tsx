import { BsCheckCircleFill, BsCircle } from "react-icons/bs";
import type { HTMLAttributes } from "react";

export type PasswordRule = {
  label: string;
  fulfilled: boolean;
  error?: boolean;
};

export interface PasswordConditionsProps extends HTMLAttributes<HTMLDivElement> {
  rules: PasswordRule[];
}

export default function ValueRequirementsList({
  rules,
  className,
  ...props
}: PasswordConditionsProps) {
  return (
    <section className={`text-sm ${className || ""}`} {...props}>
      {rules.map((rule) => (
        <span key={rule.label} className="inline-flex items-center text-sm">
          {rule.fulfilled ? (
            <BsCheckCircleFill className="mr-1.5 size-3 shrink-0 fill-green-600" />
          ) : (
            <BsCircle className="mr-1.5 size-3 shrink-0 fill-gray-400" />
          )}

          <span
            className={`${rule.fulfilled ? "text-gray-200" : rule.error ? "text-red-500" : "text-gray-400"}`}
          >
            {rule.label}
          </span>
        </span>
      ))}
    </section>
  );
}
