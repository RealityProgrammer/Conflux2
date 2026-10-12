import type {ReactNode} from "react";
import {TruncatedText} from "./TruncatedText.tsx";

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
    <div className="grid grid-cols-2 gap-x-2 text-sm mt-2 text-gray-500">
      {children}
    </div>
  );
}

interface FieldProps {
  label: ReactNode;
  value: string;
}

function Field({label, value}: FieldProps) {
  return (
    <div className="flex flex-row gap-2 items-center justify-between">
      {label}
      
      <TruncatedText>{value}</TruncatedText>
    </div>
  );
}

export const UserProfile = {
  Names,
  FieldContainer,
  Field
}