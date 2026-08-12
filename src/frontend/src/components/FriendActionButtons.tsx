import {BsPersonCheck, BsPersonDash, BsPersonPlus, BsPersonX} from "react-icons/bs";
import IconButton from "./IconButton.tsx";
import type {HTMLAttributes} from "react";

interface UnfriendButtonProps extends HTMLAttributes<HTMLButtonElement> {
  isExecuting: boolean;
}

function Send({isExecuting, ...props}: UnfriendButtonProps) {
  return (
    <IconButton theme="success" isLoading={isExecuting} {...props}>
      <BsPersonPlus className="size-6"/>
    </IconButton>
  );
}

function Unfriend({isExecuting, ...props}: UnfriendButtonProps) {
  return (
    <IconButton theme="danger" isLoading={isExecuting} {...props}>
      <BsPersonDash className="size-6"/>
    </IconButton>
  );
}

function Reject({isExecuting, ...props}: UnfriendButtonProps) {
  return (
    <IconButton theme="danger" isLoading={isExecuting} {...props}>
      <BsPersonX className="size-6"/>
    </IconButton>
  );
}

function Accept({isExecuting, ...props}: UnfriendButtonProps) {
  return (
    <IconButton theme="success" isLoading={isExecuting} {...props}>
      <BsPersonCheck className="size-6"/>
    </IconButton>
  );
}

function Cancel({isExecuting, ...props}: UnfriendButtonProps) {
  return (
    <IconButton theme="danger" isLoading={isExecuting} {...props}>
      <BsPersonX className="size-6"/>
    </IconButton>
  );
}

export const FriendActionButtons = {
  Send,
  Unfriend,
  Reject,
  Accept,
  Cancel,
};