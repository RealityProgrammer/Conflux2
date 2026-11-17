import {
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { ReactNode } from "react";
import Mention from "../Mention.tsx";

export type SerializedMentionNode = Spread<
  { userId: string; displayName: string | null },
  SerializedLexicalNode
>;

export class MentionDecoratorNode extends DecoratorNode<ReactNode> {
  __userId: string;
  __displayName: string | null;

  static getType(): string {
    return "mention-decorator";
  }

  static clone(node: MentionDecoratorNode): MentionDecoratorNode {
    return new MentionDecoratorNode(
      node.__userId,
      node.__displayName,
      node.__key,
    );
  }

  constructor(
    userId: string,
    displayName: string | null = null,
    key?: NodeKey,
  ) {
    super(key);
    this.__userId = userId;
    this.__displayName = displayName;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("span");
    dom.style.display = "inline-block";
    dom.contentEditable = "false";
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  isIsolated(): boolean {
    return true;
  }

  getTextContent(): string {
    return `:m${this.__userId}:`;
  }

  getTextContentSize(): number {
    return 3 + this.__userId.length;
  }

  decorate(): ReactNode {
    return (
      <Mention
        userId={this.__userId}
        fallbackDisplayName={this.__displayName}
      />
    );
  }

  static importJSON(
    serializedNode: SerializedMentionNode,
  ): MentionDecoratorNode {
    return new MentionDecoratorNode(serializedNode.userId);
  }

  exportJSON(): SerializedMentionNode {
    return {
      type: MentionDecoratorNode.getType(),
      version: 1,
      userId: this.__userId,
      displayName: this.__displayName,
    };
  }
}

export function $createMentionNode(
  userId: string,
  displayName: string | null = null,
): MentionDecoratorNode {
  return new MentionDecoratorNode(userId, displayName);
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionDecoratorNode {
  return node instanceof MentionDecoratorNode;
}
