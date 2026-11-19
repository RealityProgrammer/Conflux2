import { Avatar } from "radix-ui";
import { type ChangeEvent, type ReactNode, useRef } from "react";
import { usePreviewUrl } from "../hooks/usePreviewUrl.ts";

interface AvatarInputProps {
  value?: string | File | null;
  onChange?: (file: File | null) => void;
  className?: string | undefined;
  fallback: () => ReactNode;
  accept?: string;
}

export default function SelectableImageInput({
  value,
  onChange,
  className,
  fallback,
  accept = "image/png, image/jpeg, image/webp",
  ...props
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
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`group relative block overflow-hidden ${className}`} {...props}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />

      <Avatar.Root className="inline-flex size-full items-center justify-center overflow-hidden rounded-[inherit] border-2 border-white/10 align-middle">
        <Avatar.Image
          className="size-full rounded-[inherit] object-cover"
          src={displayUrl ?? undefined}
          alt="Avatar"
        />
        <Avatar.Fallback className="flex size-full items-center justify-center rounded-[inherit] bg-gray-100 text-2xl font-medium text-gray-700">
          {fallback()}
        </Avatar.Fallback>
      </Avatar.Root>

      <div
        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        onClick={handleAvatarClick}
      >
        <span className="px-2 text-center text-sm font-medium text-white">Select new image</span>
      </div>
    </div>
  );
}
