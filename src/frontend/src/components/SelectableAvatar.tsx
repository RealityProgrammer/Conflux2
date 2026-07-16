import { Avatar } from "radix-ui";
import { useState, useRef, type ChangeEvent } from "react";

interface AvatarInputProps {
    src?: string;
    fallbackText?: string;
    className?: string;
    onAvatarChange: (file: File, previewUrl: string) => void;
}

export default function SelectableAvatar({ src, fallbackText, className, onAvatarChange }: AvatarInputProps) {
    const [avatarUrl, setAvatarUrl] = useState(src);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setAvatarUrl(previewUrl);

            if (onAvatarChange) {
                onAvatarChange(file, previewUrl);
            }
        }
    };

    return (
        <div className={`relative inline-block group overflow-hidden ${className}`}>
            { /* Hidden input field */ }
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            {/* Radix UI Avatar */}
            <Avatar.Root className="inline-flex items-center justify-center align-middle w-full h-full bg-black rounded-[inherit] overflow-hidden">
                <Avatar.Image
                    className="w-full h-full object-cover rounded-[inherit]"
                    src={avatarUrl}
                    alt="User Avatar"
                />
                <Avatar.Fallback
                    className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-700 text-2xl font-medium rounded-[inherit]"
                    delayMs={600}
                >
                    {fallbackText}
                </Avatar.Fallback>
            </Avatar.Root>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer" onClick={handleAvatarClick}>
                <span className="text-white text-sm text-center font-medium px-2">
                    Click to select new avatar
                </span>
            </div>
        </div>
    );
}