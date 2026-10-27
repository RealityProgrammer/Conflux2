import {DecoratorNode, type LexicalNode, type NodeKey, type EditorConfig, type SerializedLexicalNode, type Spread} from "lexical";
import {type ReactNode} from "react";
import {Emoji} from "../../Emoji.tsx";

export type SerializedEmojiNode = Spread<{ emojiId: string; }, SerializedLexicalNode>;

export class EmojiDecoratorNode extends DecoratorNode<ReactNode> {
  _emojiId: string;

  static getType(): string {
    return "emoji-decorator";
  }

  static clone(node: EmojiDecoratorNode): EmojiDecoratorNode {
    return new EmojiDecoratorNode(node._emojiId, node.__key);
  }

  constructor(emojiId: string, key?: NodeKey) {
    super(key);
    this._emojiId = emojiId;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("span");
    dom.style.display = "inline-block";
    dom.contentEditable = "false";
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return `:e${this._emojiId}:`;
  }

  getTextContentSize(): number {
    return 2 + this._emojiId.length;
  }

  decorate(): ReactNode {
    return (
      <Emoji.Root emojiId={this._emojiId} className="size-5 inline-block align-text-bottom" />
    );
  }

  static importJSON(serializedNode: SerializedEmojiNode): EmojiDecoratorNode {
    return new EmojiDecoratorNode(serializedNode.emojiId);
  }

  exportJSON(): SerializedEmojiNode {
    return {
      type: "emoji-decorator",
      version: 1,
      emojiId: this._emojiId,
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