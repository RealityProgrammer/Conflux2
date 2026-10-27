import {DecoratorNode, type LexicalNode, type NodeKey, type EditorConfig, type SerializedLexicalNode, type Spread} from 'lexical';
import {type ReactNode} from 'react';
import {Emoji} from "../../Emoji.tsx";

export type SerializedEmojiNode = Spread<{ emojiId: string; }, SerializedLexicalNode>;

export class EmojiDecoratorNode extends DecoratorNode<ReactNode> {
  __emojiId: string;

  static getType(): string {
    return 'emoji-decorator';
  }

  static clone(node: EmojiDecoratorNode): EmojiDecoratorNode {
    return new EmojiDecoratorNode(node.__emojiId, node.__key);
  }

  constructor(emojiId: string, key?: NodeKey) {
    super(key);
    this.__emojiId = emojiId;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    dom.style.display = 'inline-block';
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return `:e${this.__emojiId}:`;
  }

  decorate(): ReactNode {
    return (
      <Emoji.Root emojiId={this.__emojiId} className="size-6 inline-block align-text-bottom" />
    );
  }

  static importJSON(serializedNode: SerializedEmojiNode): EmojiDecoratorNode {
    return new EmojiDecoratorNode(serializedNode.emojiId);
  }

  exportJSON(): SerializedEmojiNode {
    return {
      type: 'emoji-decorator',
      version: 1,
      emojiId: this.__emojiId,
    };
  }
}

// do what the roman do
export function $createEmojiNode(emojiId: string): EmojiDecoratorNode {
  return new EmojiDecoratorNode(emojiId);
}

export function $isEmojiNode(node: LexicalNode | null | undefined): node is EmojiDecoratorNode {
  return node instanceof EmojiDecoratorNode;
}