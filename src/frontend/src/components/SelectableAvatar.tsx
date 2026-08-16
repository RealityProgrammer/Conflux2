import {Avatar} from "radix-ui";
import {type ChangeEvent, type ReactNode, useEffect, useRef, useState} from "react";

interface AvatarInputProps {
  src?: string | undefined;
  className?: string | undefined;
  onAvatarChange: (file: File, previewUrl: string) => void;
  fallback: () => ReactNode;
}

export default function SelectableAvatar({src, className, onAvatarChange, fallback}: AvatarInputProps) {
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // if src updated, clear the preview url
  useEffect(() => {
    setLocalPreviewUrl(null);
  }, [src]);

  // revoke the object url
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const newPreviewUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(newPreviewUrl);

    if (onAvatarChange) {
      onAvatarChange(file, newPreviewUrl);
    }

    // make it selecting exact same file twice still trigger the onChange event
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = localPreviewUrl || src;

  return (
    <div className={`relative inline-block group overflow-hidden ${className}`}>
      { /* Hidden input field */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Radix UI Avatar */}
      <Avatar.Root
        className="inline-flex items-center justify-center align-middle w-full h-full bg-black rounded-[inherit] overflow-hidden">
        <Avatar.Image
          className="w-full h-full object-cover rounded-[inherit]"
          src={displayUrl}
          alt="User Avatar"
        />
        <Avatar.Fallback
          className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-700 text-2xl font-medium rounded-[inherit]"
        >
          {fallback()}
        </Avatar.Fallback>
      </Avatar.Root>

      {/* Hover Overlay */}
      <div
        className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
        onClick={handleAvatarClick}>
                <span className="text-white text-sm text-center font-medium px-2">
                    Click to select new avatar
                </span>
      </div>
    </div>
  );
}