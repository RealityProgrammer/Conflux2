import {
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread
} from "lexical";
import type {ReactNode} from "react";
import Mention from "../Mention.tsx";

export type SerializedMentionNode = Spread<{ userId: string; }, SerializedLexicalNode>;

export class MentionDecoratorNode extends DecoratorNode<ReactNode> {
  __userId: string;

  static getType(): string {
    return "mention-decorator";
  }

  static clone(node: MentionDecoratorNode): MentionDecoratorNode {
    return new MentionDecoratorNode(node.__userId, node.__key);
  }

  constructor(userId: string, key?: NodeKey) {
    super(key);
    this.__userId = userId;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("span");
    dom.style.display = "inline-block";
    dom.contentEditable = "false";
    return dom;
  }

  getTextContent(): string {
    return `:m${this.__userId}:`;
  }

  getTextContentSize(): number {
    return 3 + this.__userId.length;
  }

  decorate(): ReactNode {
    return (
      <Mention>
        {this.__userId}
      </Mention>
    );
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionDecoratorNode {
    return new MentionDecoratorNode(serializedNode.userId);
  }

  exportJSON(): SerializedMentionNode {
    return {
      type: MentionDecoratorNode.getType(),
      version: 1,
      userId: this.__userId,
    };
  }
}

export function $createMentionNode(userId: string): MentionDecoratorNode {
  return new MentionDecoratorNode(userId);
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionDecoratorNode {
  return node instanceof MentionDecoratorNode;
}