import {
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  TextNode,
} from "lexical";

export class MarkdownMarkerNode extends TextNode {
  static getType(): string {
    return "markdown-marker";
  }

  static clone(node: MarkdownMarkerNode): MarkdownMarkerNode {
    return new MarkdownMarkerNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.setMode("token");
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  getTextContent(): string {
    return this.__text;
  }

  getTextContentSize(): number {
    return this.__text.length;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.color = "color-mix(in oklab, var(--color-gray-400) 70%, transparent)";
    dom.className = "editor-markdown-marker";
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    return super.updateDOM(prevNode, dom, config);
  }

  static importJSON(serializedNode: SerializedTextNode): MarkdownMarkerNode {
    const node = $createMarkdownMarkerNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "markdown-marker",
    };
  }
}

export function $createMarkdownMarkerNode(text: string): MarkdownMarkerNode {
  return new MarkdownMarkerNode(text);
}

export function $isMarkdownMarkerNode(node: LexicalNode | null | undefined): node is MarkdownMarkerNode {
  return node instanceof MarkdownMarkerNode;
}
