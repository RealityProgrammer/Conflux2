import {type HTMLAttributes} from "react";
import {FaFile, FaFileAudio, FaFileVideo} from "react-icons/fa6";

interface FilePillProps extends HTMLAttributes<HTMLSpanElement> {
  file: { type: string; fileName: string; src?: string; alt?: string; };
}

function FilePill({
  file,
  className = "",
  ...props
}: FilePillProps) {
  return (
    <div className={`flex flex-row gap-2 items-center ${className}`} {...props}>
      <div className="h-full aspect-square">
        {file.type.startsWith("image/") ? (
          <img
            src={file.src}
            alt={file.alt}
            className="size-full object-cover"
          />
        ) : file.type.startsWith("video/") ? (
          <div className="size-full bg-slate-300 flex flex-row justify-center items-center">
            <FaFileVideo className="size-8 fill-gray-800"/>
          </div>
        ) : file.type.startsWith("audio/") ? (
          <div className="size-full bg-slate-300 flex flex-row justify-center items-center">
            <FaFileAudio className="size-8 fill-gray-800"/>
          </div>
        ) : (
          <div className="size-full bg-slate-300 flex flex-row justify-center items-center">
            <FaFile className="size-8 fill-gray-800"/>
          </div>
        )}
      </div>

      <p className="text-sm truncate">{file.fileName}</p>
    </div>
  )
}

export const Attachment = {
  FilePill,
}