import {type ReactNode} from "react";

interface NamesProps {
  displayName: string;
  userName: string;
}

function Names({displayName, userName}: NamesProps) {
  return (
    <p>
      <span className="text-xl font-bold truncate">{displayName}</span>
      <span className="text-sm ml-1 truncate text-stone-300">@{userName}</span>
    </p>
  );
}

function FieldContainer({children}: {children: ReactNode}) {
  return (
    <div className="grid grid-cols-1 gap-y-1.5 text-sm p-1.5 text-white border-2 border-gray-600 rounded-md bg-black/10">
      {children}
    </div>
  );
}

interface FieldProps {
  label: ReactNode;
  value: ReactNode;
}

function Field({label, value}: FieldProps) {
  return (
    <div className="flex flex-row gap-2 items-center justify-between bg-white/10 p-2 rounded-md">
      {label}
      {value}
    </div>
  );
}

const HUMOROUS_TITLES = [
  "expert at procrastinating productively",
  "professional rubber duck listener",
  "professional tab hoarder",
  "overthinker of simple decisions",
  "certified nap enjoyer",
  "the professional tab hoarder",
  "as they're surviving entirely on caffeine and hope",
  "sent from their microwave",
  "sent from their phone",
  "sent from their smart fridge",
  "expert at muting on meeting",
  "master of dark mode",
  "nemesis of light mode",
  "gravity enjoyer",
  "the circle wanderer",
  "historian of personal regret",
  "timezone confused traveler",
  "currently having political debate with a microwave",
  "threat to local buffet restaurant",
  "CEO of being late",
  "unpaid intern to their own bad habits",
  "living proof that meetings could be emails",
  "professional company-wise reply-all offender",
  "unregistered mad scientist with 15$ certificate",
  "one bad decision away from a villain origin story",
  "professional overthinker of eye contact",
  "time traveler stuck in the worst timeline",
  "architect of their inevitable downfall",
  "waiting for the sweet release of a long weekend",
  "one spreadsheet away from a total mental breakdown",
  "operating on 3 hours of sleep and bad decisions",
  "ghosting responsibilities like a bad text",
  "expert at making bad situations exponentially worse",
  "currently being unsupervised by an adult",
];

interface BioProps {
  children: ReactNode;
  displayName: string;
}

function Bio({children, displayName}: BioProps) {
  const randomTitle = HUMOROUS_TITLES[Math.floor(Math.random() * HUMOROUS_TITLES.length)]
  
  return (
    <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded-lg hover-highlight">
      <blockquote className="relative pl-3 border-l-2 border-violet-500 text-sm text-gray-200 italic leading-relaxed">
        {children}
      </blockquote>

      <span className="text-xs text-gray-400">
        -{" "}
        <span className="text-white font-semibold text-xs">{displayName}</span>
        , {randomTitle}
      </span>
    </div>
  )
}

export const UserProfile = {
  Names,
  FieldContainer,
  Field,
  Bio,
}