import {DecoratorNode, type NodeKey, type EditorConfig, type SerializedLexicalNode, type Spread, type LexicalNode} from "lexical";
import { type ReactNode } from "react";
import Timestamp from "../Timestamp.tsx";

export type SerializedTimestampNode = Spread<
  {
    timestamp: number;
  },
  SerializedLexicalNode
>;

export class TimestampDecoratorNode extends DecoratorNode<ReactNode> {
  __timestamp: number;

  static getType(): string {
    return "timestamp-decorator";
  }

  static clone(node: TimestampDecoratorNode): TimestampDecoratorNode {
    return new TimestampDecoratorNode(node.__timestamp, node.__key);
  }

  constructor(timestamp: number, key?: NodeKey) {
    super(key);
    this.__timestamp = timestamp;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("span");
    dom.style.display = "inline-block";
    dom.contentEditable = "false";
    dom.style.userSelect = "none"
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
    return `:t${this.__timestamp}:`;
  }

  decorate(): ReactNode {
    return (
      <Timestamp date={new Date(this.__timestamp)}/>
    );
  }

  static importJSON(serializedNode: SerializedTimestampNode): TimestampDecoratorNode {
    return $createTimestampNode(serializedNode.timestamp);
  }

  exportJSON(): SerializedTimestampNode {
    return {
      type: TimestampDecoratorNode.getType(),
      version: 1,
      timestamp: this.__timestamp,
    };
  }
}

export function $createTimestampNode(timestamp: number): TimestampDecoratorNode {
  return new TimestampDecoratorNode(timestamp);
}

export function $isTimestampNode(node: LexicalNode | null | undefined): node is TimestampDecoratorNode {
  return node instanceof TimestampDecoratorNode;
}