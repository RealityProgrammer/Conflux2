import {$createEmojiNode, EmojiDecoratorNode} from "./nodes/EmojiDecoratorNode.tsx";
import {type TextMatchTransformer, TEXT_FORMAT_TRANSFORMERS} from '@lexical/markdown';
import {$createTimeNode, TimestampDecoratorNode} from "./nodes/TimestampDecoratorNode.tsx";

export const EMOJI_TRANSFORMER: TextMatchTransformer = {
  type: 'text-match',
  dependencies: [EmojiDecoratorNode],
  importRegExp: /:e([\w\-]+):/,
  regExp: /:e([\w\-]+):$/,
  replace: (textNode, match) => {
    const [, emojiId] = match;
    const emojiNode = $createEmojiNode(emojiId);
    textNode.replace(emojiNode);
  },
  trigger: ' ',
  export: (node) => {
    if (node instanceof EmojiDecoratorNode) {
      return `:e${node._emojiId}:`;
    }
    return null;
  },
};

export const TIME_TRANSFORMER: TextMatchTransformer = {
  type: 'text-match',
  dependencies: [TimestampDecoratorNode],
  importRegExp: /:t(\d+):/,
  regExp: /:t(\d+):$/,
  replace: (textNode, match) => {
    const [, timestampStr] = match;
    const timeNode = $createTimeNode(Number(timestampStr));
    textNode.replace(timeNode);
  },
  trigger: ' ',
  export: (node) => {
    if (node instanceof TimestampDecoratorNode) {
      return `:t${node._timestamp}:`;
    }
    return null;
  },
};

export const CHAT_TRANSFORMERS = [
  EMOJI_TRANSFORMER,
  TIME_TRANSFORMER,
  ...TEXT_FORMAT_TRANSFORMERS,
];