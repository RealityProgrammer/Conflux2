import type {HTMLAttributes} from "react";

interface FilePillProps extends HTMLAttributes<HTMLSpanElement> {
  file: { type: string; fileName: string; previewSrc?: string; alt?: string; };
}

function FilePill({
  file,
  className = "",
  ...props
}: FilePillProps) {
  return (
    <div className={`flex flex-row gap-2 items-center ${className}`} {...props}>
      <div className="h-full aspect-square">
        {file.type.startsWith("image/") && (
          <img
            src={file.previewSrc}
            alt={file.alt}
            className="size-full object-cover"
          />
        )}
      </div>

      <p className="text-sm truncate">{file.fileName}</p>
    </div>
  )
}

export const Attachment = {
  FilePill,
}