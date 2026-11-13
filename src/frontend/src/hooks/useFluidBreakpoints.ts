export type BreakpointType =
  | typeof BREAKPOINTS[number]
  | "full";

export const BREAKPOINTS = ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"] as const;

const CLASSES = {
  "sm": "sm:max-w-sm",
  "md": "md:max-w-md",
  "lg": "lg:max-w-lg",
  "xl": "xl:max-w-xl",
  "2xl": "2xl:max-w-2xl",
  "3xl": "3xl:max-w-3xl",
  "4xl": "4xl:max-w-4xl",
  "5xl": "5xl:max-w-5xl",
  "6xl": "6xl:max-w-6xl",
  "7xl": "7xl:max-w-7xl",
} as const;

const CONTAINER_CLASSES = {
  "sm": "@sm:max-w-sm",
  "md": "@md:max-w-md",
  "lg": "@lg:max-w-lg",
  "xl": "@xl:max-w-xl",
  "2xl": "@2xl:max-w-2xl",
  "3xl": "@3xl:max-w-3xl",
  "4xl": "@4xl:max-w-4xl",
  "5xl": "@5xl:max-w-5xl",
  "6xl": "@6xl:max-w-6xl",
  "7xl": "@7xl:max-w-7xl",
}

export default function useFluidBreakpoints(
  maxBreakpoint: BreakpointType,
  container?: boolean
) {
  if (maxBreakpoint === "full") {
    return "max-w-full";
  }

  const maxIndex = BREAKPOINTS.indexOf(maxBreakpoint);

  const breakpoints = BREAKPOINTS.slice(
    0,
    maxIndex !== -1 ? maxIndex + 1 : BREAKPOINTS.length
  );

  const classes = container ?
    breakpoints.map((breakpoint) => CONTAINER_CLASSES[breakpoint]) :
    breakpoints.map((breakpoint) => CLASSES[breakpoint]);

  return classes.join(" ");
}