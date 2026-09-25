import { useEffect, useState } from "react";

export function usePreviewUrl(
  value: File | string | null | undefined,
  fallbackUrl?: string | null
): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreviewUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [value]);

  if (value instanceof File) return previewUrl;
  if (value === null) return null;
  if (typeof value === "string") return value;

  return fallbackUrl ?? null;
}