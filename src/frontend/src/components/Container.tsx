import type {ReactNode} from "react";
import useFluidBreakpoints, {type BREAKPOINTS, type BreakpointType} from "../hooks/useFluidBreakpoints.ts";

interface ContainerProps {
  maxBreakpoint: BreakpointType;
  className?: string;
  containerClassName?: string;
  children?: ReactNode;
}

export default function Container({
  maxBreakpoint,
  containerClassName = "",
  className = "",
  children,
}: ContainerProps) {
  const fluidBreakpoints = useFluidBreakpoints(maxBreakpoint, true);
  
  return (
    <div className={`@container w-full ${containerClassName}`}>
      <div className={`mx-auto w-full max-w-full ${fluidBreakpoints} ${className}`}>
        {children}
      </div>
    </div>
  );
}