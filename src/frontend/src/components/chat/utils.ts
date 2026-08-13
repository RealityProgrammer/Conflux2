import {layout, type LayoutResult, prepare, type PreparedText} from "@chenglou/pretext";

const BODY_FONT = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type CachedMessage = {
  prepared: PreparedText;
  content: string;
};

const preparedCache = new Map<string, CachedMessage>();
const MAX_PREPARED_CACHE_SIZE = 512;

function getPreparedMessage(id: string, content: string): PreparedText {
  if (preparedCache.has(id)) {
    const cached = preparedCache.get(id)!;

    if (cached.content === content) {
      preparedCache.delete(id);
      preparedCache.set(id, cached);
      return cached.prepared;
    }
  }

  if (preparedCache.size >= MAX_PREPARED_CACHE_SIZE) {
    const oldestKey = preparedCache.keys().next().value;
    if (oldestKey) preparedCache.delete(oldestKey);
  }

  const prepared = prepare(content, BODY_FONT, {
    whiteSpace: 'pre-wrap',
    wordBreak: 'normal',
  });

  preparedCache.set(id, {prepared, content});
  return prepared;
}

export function estimateMessageLayout(id: string, content: string, displayAreaWidth: number, lineHeight: number): { height: number, lineCount: number } {
  const prepared = getPreparedMessage(id, content);

  const isSupported: boolean = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

  if (!isSupported) {
    console.error("pretext is not supported.");
    return {height: 0, lineCount: 0};
  } else {
    const layoutResult: LayoutResult = layout(prepared, displayAreaWidth, lineHeight);
    return {height: layoutResult.height, lineCount: layoutResult.lineCount};
  }
}