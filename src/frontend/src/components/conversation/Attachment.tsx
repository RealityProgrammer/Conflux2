import { type HTMLAttributes } from "react";
import { FaFile, FaFileAudio, FaFileVideo } from "react-icons/fa6";

interface FilePillProps extends HTMLAttributes<HTMLSpanElement> {
  file: { type: string; fileName: string; src?: string; alt?: string };
}

function FilePill({ file, className = "", ...props }: FilePillProps) {
  return (
    <div className={`flex flex-row items-center gap-2 ${className}`} {...props}>
      <div className="aspect-square h-full">
        {file.type.startsWith("image/") ? (
          <img src={file.src} alt={file.alt} className="size-full object-cover" />
        ) : file.type.startsWith("video/") ? (
          <div className="flex size-full flex-row items-center justify-center bg-slate-300">
            <FaFileVideo className="size-8 fill-gray-800" />
          </div>
        ) : file.type.startsWith("audio/") ? (
          <div className="flex size-full flex-row items-center justify-center bg-slate-300">
            <FaFileAudio className="size-8 fill-gray-800" />
          </div>
        ) : (
          <div className="flex size-full flex-row items-center justify-center bg-slate-300">
            <FaFile className="size-8 fill-gray-800" />
          </div>
        )}
      </div>

      <p className="truncate text-sm">{file.fileName}</p>
    </div>
  );
}

export const Attachment = {
  FilePill,
};
