import {PresenceStatus} from "../graphql/types.ts";
import type {SVGAttributes} from "react";
import {BsCircleFill} from "react-icons/bs";
import {LuBellOff} from "react-icons/lu";
import {FiCoffee} from "react-icons/fi";

interface PresenceStatusProps extends SVGAttributes<SVGElement> {
  status: PresenceStatus;
}

export default function PresenceStatusIcon({
  status,
  className = '',
  ...props
}: PresenceStatusProps) {
  return (
    <>
      {status === PresenceStatus.Online ? (
        <BsCircleFill className={`fill-green-500 ${className}`}/>
      ) : status === PresenceStatus.DoNotDisturb ? (
        <LuBellOff className={`fill-red-400 ${className}`}/>
      ) : status === PresenceStatus.Idle ? (
        <FiCoffee className={`fill-amber-400 ${className}`}/>
      ) : (
        <BsCircleFill className={`fill-gray-400 ${className}`}/>
      )}
    </>
  )
}