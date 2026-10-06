import type {Duration} from "date-fns";
import {formatDuration} from "date-fns";

export function formatReadableTimeSpan(
  str: string
): string {
  if (!str) return '';

  let days: number = 0;
  let hours: number = 0;
  let minutes: number = 0;
  let seconds: number = 0;
  let timePart: string = str;

  if (str.includes('.')) {
    const dotParts = str.split('.');
    if (!dotParts[0].includes(':')) {
      days = parseInt(dotParts[0], 10) || 0;
      timePart = dotParts[1];
    }
  }

  const colonParts = timePart.split(':');

  hours = parseInt(colonParts[0], 10) || 0;
  minutes = parseInt(colonParts[1], 10) || 0;
  seconds = Math.floor(parseFloat(colonParts[2])) || 0;

  const duration: Duration = { days, hours, minutes, seconds };

  const formatted = formatDuration(duration)
    .replace(/ days?/g, 'd')
    .replace(/ hours?/g, 'h')
    .replace(/ minutes?/g, 'm')
    .replace(/ seconds?/g, 's')
    .replace(/,\s*$/, ''); // clean up trailing comma

  return formatted || '0s';
}