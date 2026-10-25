import type {ReactNode} from "react";

const BREAKPOINTS = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'] as const;

const CONTAINER_CLASSES = {
  sm: '@sm:max-w-sm',
  md: '@md:max-w-md',
  lg: '@lg:max-w-lg',
  xl: '@xl:max-w-xl',
  '2xl': '@2xl:max-w-2xl',
  '3xl': '@3xl:max-w-3xl',
  '4xl': '@4xl:max-w-4xl',
  '5xl': '@5xl:max-w-5xl',
  '6xl': '@6xl:max-w-6xl',
  '7xl': '@7xl:max-w-7xl',
} as const;

interface ContainerProps {
  minBreakpoint?: typeof BREAKPOINTS[number];
  maxBreakpoint: typeof BREAKPOINTS[number];
  className?: string;
  containerClassName?: string;
  children?: ReactNode;
}

export default function Container({
  minBreakpoint = "sm",
  maxBreakpoint,
  containerClassName = "",
  className = "",
  children,
}: ContainerProps) {
  const minIndex = BREAKPOINTS.indexOf(minBreakpoint);
  const maxIndex = BREAKPOINTS.indexOf(maxBreakpoint);

  const selectedClasses = BREAKPOINTS.slice(
    minIndex !== -1 ? minIndex : 0,
    maxIndex !== -1 ? maxIndex + 1 : BREAKPOINTS.length
  ).map((breakpoint) => CONTAINER_CLASSES[breakpoint]).join(' ');
  
  return (
    <div className={`@container w-full ${containerClassName}`}>
      <div className={`mx-auto w-full max-w-full ${selectedClasses} ${className}`}>
        {children}
      </div>
    </div>
  );
}