import {LexicalExtensionComposer} from "@lexical/react/LexicalExtensionComposer";
import {
  defineExtension,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  type EditorState,
  type RangeSelection,
  type LexicalNode,
  $isTextNode,
  $isElementNode,
} from "lexical";
import {RichTextExtension} from "@lexical/rich-text";
import {HistoryExtension} from '@lexical/history';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect, type Ref, useRef, useImperativeHandle} from "react";
import {
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_LOW,
  type LexicalEditor,
  type TextNode,
  $createRangeSelection,
  $setSelection
} from "lexical";
import {$createEmojiNode, EmojiDecoratorNode} from "./nodes/EmojiDecoratorNode.tsx";

export interface MessageTextboxEditorRef {
  reset: () => void;
  focus: () => void;
  insertText: (text: string, startOffset: number, endOffset: number) => void;
  insertEmojiNode: (emojiId: string, startOffset: number, endOffset: number) => void;
}

interface MessageTextboxEditorProps {
  onTextChange: (text: string, cursorPosition: number) => void;
  onEnterSend: () => void;
  ref?: Ref<MessageTextboxEditorRef>;
}

const lexicalExtensions = defineExtension({
  name: "ChatInputEditor",
  dependencies: [
    RichTextExtension,
    HistoryExtension,
  ],
  nodes: [
    EmojiDecoratorNode,
  ],
  theme: {},
  onError(error: Error) {
    console.error(error);
  },
});

function $selectRangeByGlobalOffsets(startOffset: number, endOffset: number) {
  const root = $getRoot();
  const textNodes = root.getAllTextNodes();

  let currentLength = 0;
  let startPoint: { node: LexicalNode; offset: number } | null = null;
  let endPoint: { node: LexicalNode; offset: number } | null = null;

  function traverse(node: LexicalNode) {
    if (startPoint && endPoint) return;

    if ($isElementNode(node)) {
      const children = node.getChildren();
      for (const child of children) {
        traverse(child);
      }
    } else {
      const nodeText = node.getTextContent();
      const nodeLength = nodeText.length;

      if (!startPoint && currentLength + nodeLength >= startOffset) {
        if ($isTextNode(node)) {
          startPoint = { node, offset: startOffset - currentLength };
        } else {
          startPoint = { node, offset: 0 };
        }
      }

      if (!endPoint && currentLength + nodeLength >= endOffset) {
        if ($isTextNode(node)) {
          endPoint = { node, offset: endOffset - currentLength };
        } else {
          endPoint = { node, offset: nodeLength > 0 ? nodeLength : 0 };
        }
      }

      currentLength += nodeLength;
    }
  }

  traverse(root);

  // fallback if offsets land at the very end of the document
  if (!startPoint && textNodes.length > 0) {
    const lastNode = textNodes[textNodes.length - 1];
    startPoint = { node: lastNode, offset: lastNode.getTextContentSize() };
  }

  if (!endPoint && textNodes.length > 0) {
    const lastNode = textNodes[textNodes.length - 1];
    endPoint = { node: lastNode, offset: lastNode.getTextContentSize() };
  }

  if (startPoint && endPoint) {
    const selection = $createRangeSelection();
    selection.anchor.set(startPoint.node.getKey(), startPoint.offset, 'text');
    selection.focus.set(endPoint.node.getKey(), endPoint.offset, 'text');
    $setSelection(selection);
  }
}

export default function MessageTextboxEditor({
  onTextChange,
  onEnterSend,
  ref,
}: MessageTextboxEditorProps) {
  const editorRef = useRef<LexicalEditor | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      editorRef.current?.update(() => {
        $getRoot().clear();
      });
    },
    focus: () => {
      editorRef.current?.focus();
    },
    insertText: (text: string, startOffset: number, endOffset: number) => {
      editorRef.current?.update(() => {
        $selectRangeByGlobalOffsets(startOffset, endOffset);
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          selection.insertText(text);
        }
      });
    },
    insertEmojiNode: (emojiId: string, startOffset: number, endOffset: number) => {
      editorRef.current?.update(() => {
        $selectRangeByGlobalOffsets(startOffset, endOffset);
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          const emojiNode = $createEmojiNode(emojiId);
          selection.insertNodes([emojiNode]);
          emojiNode.insertAfter($createTextNode(' '));
        }
      });
    },
  }), []);

  return (
    <LexicalExtensionComposer extension={lexicalExtensions}>
      <div className="flex-1 relative flex flex-row items-end gap-2">
        <TextArea
          onTextChange={onTextChange}
          onEnterSend={onEnterSend}
          onEditorReady={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>
    </LexicalExtensionComposer>
  );
}

interface TextAreaProps {
  onTextChange: (text: string, cursorPosition: number) => void;
  onEnterSend: () => void;
  onEditorReady: (editor: LexicalEditor) => void;
}

function TextArea({
  onTextChange,
  onEnterSend,
  onEditorReady,
}: TextAreaProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault(); // prevent insert new line
          onEnterSend();

          return true; // handled
        }

        return false; // propagate to other listener
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onEnterSend]);

  return (
    <div className="input-field min-h-10 max-h-36 w-full flex-1 text-sm py-2 px-3 overflow-y-auto leading-relaxed relative">
      <ContentEditable
        className="outline-none min-h-full whitespace-pre-wrap break-all"
      />

      <LexicalSyncPlugin onTextChange={onTextChange}/>
    </div>
  )
}

function LexicalSyncPlugin({ onTextChange }: { onTextChange: (text: string, cursor: number) => void }) {
  return (
    <OnChangePlugin
      onChange={(editorState: EditorState) => {
        editorState.read(() => {
          const text = $getRoot().getTextContent();
          const selection = $getSelection();

          let cursor = 0;
          if ($isRangeSelection(selection)) {
            cursor = getGlobalCursorOffset(selection);
          }

          onTextChange(text, cursor);
        });
      }}
    />
  );
}

function getGlobalCursorOffset(selection: RangeSelection): number {
  const anchor = selection.anchor;
  const anchorNode = anchor.getNode();
  const anchorOffset = anchor.offset;

  const root = $getRoot();
  let globalOffset = 0;

  function walk(node: LexicalNode): boolean {
    if (node === anchorNode) {
      if ($isTextNode(node)) {
        globalOffset += anchorOffset;
      } else if ($isElementNode(node)) {
        const children = node.getChildren();

        for (let i = 0; i < anchorOffset && i < children.length; i++) {
          globalOffset += children[i].getTextContent().length;
        }
      }

      return true;
    }

    if ($isElementNode(node)) {
      const children = node.getChildren();

      for (const child of children) {
        if (walk(child)) return true;
      }
    } else {
      globalOffset += node.getTextContent().length;
    }

    return false;
  }

  walk(root);
  return globalOffset;
}