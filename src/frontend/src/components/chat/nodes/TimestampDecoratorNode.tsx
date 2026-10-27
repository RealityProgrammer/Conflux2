import {DecoratorNode, type NodeKey, type EditorConfig, type SerializedLexicalNode, type Spread, type LexicalNode} from "lexical";
import { type ReactNode } from "react";
import Timestamp from "../Timestamp.tsx";

export type SerializedTimeNode = Spread<
  {
    timestamp: number;
  },
  SerializedLexicalNode
>;

export class TimestampDecoratorNode extends DecoratorNode<ReactNode> {
  _timestamp: number;

  static getType(): string {
    return "time-decorator";
  }

  static clone(node: TimestampDecoratorNode): TimestampDecoratorNode {
    return new TimestampDecoratorNode(node._timestamp, node.__key);
  }

  constructor(timestamp: number, key?: NodeKey) {
    super(key);
    this._timestamp = timestamp;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("span");
    dom.style.display = "inline-block";
    dom.contentEditable = "false";
    dom.style.userSelect = "none"
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return `:t${this._timestamp}:`;
  }

  decorate(): ReactNode {
    return (
      <Timestamp date={new Date(this._timestamp)}/>
    );
  }

  static importJSON(serializedNode: SerializedTimeNode): TimestampDecoratorNode {
    return $createTimeNode(serializedNode.timestamp);
  }

  exportJSON(): SerializedTimeNode {
    return {
      type: "time-decorator",
      version: 1,
      timestamp: this._timestamp,
    };
  }
}

export function $createTimeNode(timestamp: number): TimestampDecoratorNode {
  return new TimestampDecoratorNode(timestamp);
}

export function $isTimeNode(node: LexicalNode | null | undefined): node is TimestampDecoratorNode {
  return node instanceof TimestampDecoratorNode;
}