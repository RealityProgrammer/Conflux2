import type { ChangeEventHandler, RefObject } from "react";

interface MessageAttachmentInputProps {
  ref?: RefObject<HTMLInputElement | null>;
  onChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement>;
}

export default function MessageAttachmentInput({
  ref,
  onChange,
}: MessageAttachmentInputProps) {
  return (
    <input
      ref={ref}
      type="file"
      className="hidden"
      accept="image/jpeg, image/png, image/gif, audio/ogg, audio/wav, audio/mp4, audio/mpeg, audio/vorbis, video/H263, video/H264, video/H265, video/mp4, video/ogg"
      multiple
      hidden
      onChange={onChange}
    />
  );
}
