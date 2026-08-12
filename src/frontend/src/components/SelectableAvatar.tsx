import {Avatar} from "radix-ui";
import {type ChangeEvent, useEffect, useRef, useState} from "react";
import {BsPerson} from "react-icons/bs";

interface AvatarInputProps {
  src?: string | undefined;
  className?: string | undefined;
  onAvatarChange: (file: File, previewUrl: string) => void;
}

export default function SelectableAvatar({src, className, onAvatarChange}: AvatarInputProps) {
  const [avatarUrl, setAvatarUrl] = useState(src);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // set avatar preview
  useEffect(() => {
    if (src === localPreviewUrl) return;

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }

    setAvatarUrl(src);
  }, [src, localPreviewUrl]);

  // free the old preview url
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // just in case lmao
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }

      const newPreviewUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(newPreviewUrl);
      setAvatarUrl(newPreviewUrl);

      if (onAvatarChange) {
        onAvatarChange(file, newPreviewUrl);
      }

      // no idea if this is needed but make it so that selecting exact same file twice still
      // triggers the onChange event
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
          src={avatarUrl}
          alt="User Avatar"
        />
        <Avatar.Fallback
          className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-700 text-2xl font-medium rounded-[inherit]"
          delayMs={600}
        >
          <BsPerson className="fill-black size-5/6"/>
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