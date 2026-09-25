import {Avatar} from "radix-ui";
import {type ChangeEvent, type ReactNode, useEffect, useRef, useState} from "react";
import {usePreviewUrl} from "../hooks/usePreviewUrl.ts";

interface AvatarInputProps {
  value?: string | File | null;
  onChange?: (file: File | null) => void;
  className?: string | undefined;
  fallback: () => ReactNode;
}

export default function SelectableImageInput({
  value,
  onChange,
  className,
  fallback
}: AvatarInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const displayUrl = usePreviewUrl(value);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onChange?.(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`relative block w-full group overflow-hidden ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      <Avatar.Root
        className="inline-flex items-center justify-center align-middle w-full h-full bg-black rounded-[inherit] overflow-hidden">
        <Avatar.Image
          className="w-full h-full object-cover rounded-[inherit]"
          src={displayUrl ?? undefined}
          alt="User Avatar"
        />
        <Avatar.Fallback
          className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-700 text-2xl font-medium rounded-[inherit]"
        >
          {fallback()}
        </Avatar.Fallback>
      </Avatar.Root>

      <div
        className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
        onClick={handleAvatarClick}
      >
        <span className="text-white text-sm text-center font-medium px-2">
           Select new image
        </span>
      </div>
    </div>
  );
}