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
  $isElementNode, $createParagraphNode, $isParagraphNode,
  SELECTION_CHANGE_COMMAND,
  mergeRegister, KEY_TAB_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND, type ElementNode,
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
  TextNode,
  $createRangeSelection,
  $setSelection
} from "lexical";
import {$createEmojiNode, EmojiDecoratorNode} from "./nodes/EmojiDecoratorNode.tsx";
import {$createTimeNode, TimestampDecoratorNode} from "./nodes/TimestampDecoratorNode.tsx";
import {findMatchingEmoji} from "../../hooks/useUserEmojis.ts";
import { ListNode, ListItemNode, registerList, $isListItemNode, registerCheckList } from '@lexical/list';
import { HeadingNode, QuoteNode, $isQuoteNode } from '@lexical/rich-text';
import { CodeNode, CodeHighlightNode, $isCodeNode, $createCodeNode, CodeExtension } from '@lexical/code-core';
import {
  registerMarkdownShortcuts,
  $convertToMarkdownString,
  HEADING,
  QUOTE,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  INLINE_CODE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE
} from '@lexical/markdown';
import {
  LinkNode,
  AutoLinkNode,
  registerAutoLink,
  type LinkMatcher,
  createLinkMatcherWithRegExp
} from '@lexical/link';

export type SuggestionData =
  { type: 'mode'; startColonIndex: number } |
  { type: 'emoji'; startColonIndex: number; modeIndex: number; startPayloadIndex: number; searchTerm: string } |
  { type: 'time'; startColonIndex: number; modeIndex: number; startPayloadIndex: number; milliseconds: number; rawValue: string };

export interface MessageTextboxEditorRef {
  reset: () => void;
  focus: () => void;
  insertText: (text: string, startOffset: number, endOffset: number) => void;
  insertEmojiNode: (emojiId: string, startOffset: number, endOffset: number) => void;
  convertToMarkdownString: () => string;
}

interface MessageTextboxEditorProps {
  onTextChange: (text: string, cursorPosition: number) => void;
  onEnterSend: () => void;
  onSuggestionChange: (data: SuggestionData | undefined) => void;
  ref?: Ref<MessageTextboxEditorRef>;
}

const URL_MATCHER = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)([A-Za-z0-9.-]+\.[a-z]{2,}(?:\/[+~%\/.\w-_]*)?\??[-+=&;%@.\w_]*#?\w*)?)/i;

const LINK_MATCHERS: LinkMatcher[] = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) => {
    // prepend https:// if missing from a domain link like "google.com"
    return text.startsWith('http') ? text : `https://${text}`;
  }),
];

const CHAT_MARKDOWN_TRANSFORMERS = [
  HEADING,
  QUOTE,
  CHECK_LIST,       // must be before UNORDERED_LIST and ORDERED_LIST
  UNORDERED_LIST,
  ORDERED_LIST,
  INLINE_CODE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
];

export const MarkdownShortcutsExtension = defineExtension({
  name: 'MarkdownShortcutsExtension',
  nodes: () => [
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    CodeHighlightNode,
  ],
  register(editor) {
    return mergeRegister(
      registerCheckList(editor),
      registerList(editor),
      registerMarkdownShortcuts(editor, CHAT_MARKDOWN_TRANSFORMERS),
    );
  },
});

export const CustomTransformExtension = defineExtension({
  name: 'CustomTransformExtension',
  nodes: () => [EmojiDecoratorNode, TimestampDecoratorNode],
  register(editor) {
    return editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      if (!textNode.isAttached()) return;

      const text = textNode.getTextContent();

      // codeblock match
      const codeFenceMatch = text.match(/(?:^|\n)```([\w-]*)\s$/);
      if (codeFenceMatch) {
        const fullMatch = codeFenceMatch[0];
        const language = codeFenceMatch[1] || '';
        const parent = textNode.getParent();

        if (parent) {
          const paragraphText = parent.getTextContent();
          const matchIndex = paragraphText.lastIndexOf(fullMatch);

          const codeNode = $createCodeNode(language);

          if (matchIndex > 0) {
            // Preserve line 1 text above the codeblock
            const textBefore = paragraphText.slice(0, matchIndex).trimEnd();
            const precedingParagraph = $createParagraphNode();
            precedingParagraph.append($createTextNode(textBefore));
            parent.insertBefore(precedingParagraph);
          }

          parent.replace(codeNode);
          codeNode.select();
          return;
        }
      }

      const emojiMatch = text.match(/:e([\w\-]+):/);
      if (emojiMatch) {
        const fullMatch = emojiMatch[0];
        const emojiIdentifier = emojiMatch[1]; // could be either id or shortcode
        const index = emojiMatch.index!;

        const matchedEmoji = findMatchingEmoji(emojiIdentifier);

        if (!matchedEmoji) return;

        let targetNode = textNode;

        // isolate the shortcode by splitting before and after it
        if (index > 0) {
          [, targetNode] = targetNode.splitText(index);
        }

        if (targetNode.getTextContent().length > fullMatch.length) {
          targetNode.splitText(fullMatch.length);
        }

        const emojiNode = $createEmojiNode(matchedEmoji.id);
        targetNode.replace(emojiNode);
        return;
      }

      const timeMatch = text.match(/:t(\d*):/);
      if (timeMatch) {
        const fullMatch = timeMatch[0];
        const timestampStr = timeMatch[1].length === 0 ? new Date().getTime() : timeMatch[1];
        const index = timeMatch.index!;

        let targetNode = textNode;

        if (index > 0) {
          [, targetNode] = targetNode.splitText(index);
        }
        if (targetNode.getTextContent().length > fullMatch.length) {
          targetNode.splitText(fullMatch.length);
        }

        const timeNode = $createTimeNode(Number(timestampStr));
        targetNode.replace(timeNode);
        return;
      }
    });
  },
});

export const LinkExtension = defineExtension({
  name: 'LinkExtension',
  nodes: () => [LinkNode, AutoLinkNode],
  register(editor) {
    return mergeRegister(
      registerAutoLink(editor, {
        matchers: LINK_MATCHERS,
        changeHandlers: [],
        excludeParents: [
          $isCodeNode,
          $isQuoteNode,
        ]
      }),
    );
  },
});

const lexicalExtensions = defineExtension({
  name: "ChatInputEditor",
  dependencies: [
    RichTextExtension,
    CodeExtension,
    HistoryExtension,
    MarkdownShortcutsExtension,
    CustomTransformExtension,
    LinkExtension,
  ],
  theme: {
    heading: {
      h1: "message-h1",
      h2: "message-h2",
      h3: "message-h3",
      h4: "message-h4",
      h5: "message-h5",
      h6: "message-h6",
    },
    list: {
      ul: "message-ul",
      ol: "message-ol",
      listitem: "message-li",
      listitemChecked: "message-li-checked",
      listitemUnchecked: "message-li-unchecked",
      nested: {
        listitem: 'list-none',
      },
    },
    text: {
      bold: "message-bold",
      italic: "message-italic",
      code: "message-inline-code",
    },
    code: "block w-full box-border overflow-x-auto p-3.5 rounded-md bg-[rgb(43,43,43)] border-2 border-gray-600 text-sm font-mono text-white whitespace-pre",
    quote: "message-quote whitespace-pre-wrap",
    link: "text-blue-400",
  },
  onError(error: Error) {
    console.error(error);
  },
});

export default function MessageTextboxEditor({
  onTextChange,
  onEnterSend,
  onSuggestionChange,
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
        selectRangeByGlobalOffsets(startOffset, endOffset);
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          selection.insertText(text);
        }
      });
    },
    insertEmojiNode: (emojiId: string, startOffset: number, endOffset: number) => {
      editorRef.current?.update(() => {
        selectRangeByGlobalOffsets(startOffset, endOffset);
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          const emojiNode = $createEmojiNode(emojiId);
          selection.insertNodes([emojiNode]);
          emojiNode.insertAfter($createTextNode(' '));
        }
      });
    },
    convertToMarkdownString: (): string => {
      return editorRef.current?.read(() => {
        return $convertToMarkdownString(CHAT_MARKDOWN_TRANSFORMERS);
      }) ?? "";
    },
  }), []);

  return (
    <LexicalExtensionComposer extension={lexicalExtensions} contentEditable={null}>
      <div className="flex-1 relative flex flex-row items-end gap-2">
        <TextArea
          onTextChange={onTextChange}
          onEnterSend={onEnterSend}
          onSuggestionChange={onSuggestionChange}
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
  onSuggestionChange: (data: SuggestionData | undefined) => void;
}

function TextArea({
  onTextChange,
  onEnterSend,
  onEditorReady,
  onSuggestionChange,
}: TextAreaProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onEditorReady(editor);
  }, [editor, onEditorReady]);

  // handle escape to next paragraph block when user press Escape on codeblock or quoteblock
  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          let escaped = false;
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const node = selection.anchor.getNode();

              const blockContainer = node.getParents().find((p) => $isCodeNode(p) || $isQuoteNode(p)) ||
                ($isCodeNode(node) || $isQuoteNode(node) ? node : null);

              if (blockContainer) {
                const nextSibling = blockContainer.getNextSibling();

                // if next sibling is paragraph or text, select it, else create new
                if ($isParagraphNode(nextSibling)) {
                  nextSibling.selectStart();
                  escaped = true;
                } else {
                  const paragraph = $createParagraphNode();
                  blockContainer.insertAfter(paragraph);
                  paragraph.select();
                  escaped = true;
                }
              }
            }
          });

          if (escaped) {
            event.preventDefault();
            return true;
          }
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  // enter handling to send message or linebreak in certain node
  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key === "Enter") {
          // soft line break
          if (event.shiftKey) {
            return false;
          }

          let isCode = false;
          let isQuote = false;
          let isListItem = false;

          editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const node = selection.anchor.getNode();

              isCode = $isCodeNode(node) || node.getParents().some($isCodeNode);
              isQuote = $isQuoteNode(node) || node.getParents().some($isQuoteNode);
              isListItem = $isListItemNode(node) || node.getParents().some($isListItemNode);
            }
          });

          // special blocks, let lexical handle new line and escape the node.
          if (isCode || isQuote || isListItem) {
            return false;
          }

          event.preventDefault();
          onEnterSend();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onEnterSend]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event: KeyboardEvent) => {
        let isListItem = false;

        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const node = selection.anchor.getNode();
            isListItem = $isListItemNode(node) || node.getParents().some($isListItemNode);
          }
        });

        // If we are inside a list item, Tab indents/nests, Shift+Tab outdents
        if (isListItem) {
          event.preventDefault();
          editor.dispatchCommand(
            event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
            undefined
          );
          return true;
        }

        return false; // Let standard tab behavior happen elsewhere
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  // reset format when text node is empty (removing sticky formatting)
  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && selection.isCollapsed()) {
            const node = selection.anchor.getNode();

            // Find the parent paragraph
            const paragraph = $isParagraphNode(node)
              ? node
              : node.getParents().find($isParagraphNode);

            if (paragraph && paragraph.getTextContentSize() === 0) {
              selection.format = 0;
            }
          }
        });
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  // suggestion listener
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          onSuggestionChange(undefined);
          return;
        }

        const anchor = selection.anchor;
        const node = anchor.getNode();

        // Suggestions only occur inside normal text nodes
        if (!$isTextNode(node)) {
          onSuggestionChange(undefined);
          return;
        }

        const textBeforeCursor = node.getTextContent().slice(0, anchor.offset);

        // 1. Emoji Match
        const emojiMatch = textBeforeCursor.match(/:e([\w-]*)$/);
        if (emojiMatch) {
          const localColonIdx = emojiMatch.index!;
          onSuggestionChange({
            type: "emoji",
            startColonIndex: getGlobalOffsetForNodeOffset(node, localColonIdx),
            modeIndex: getGlobalOffsetForNodeOffset(node, localColonIdx + 1),
            startPayloadIndex: getGlobalOffsetForNodeOffset(node, localColonIdx + 2),
            searchTerm: emojiMatch[1] || "",
          });
          return;
        }

        // 2. Time Match
        const timeMatch = textBeforeCursor.match(/:t(\d*)$/);
        if (timeMatch) {
          const localColonIdx = timeMatch.index!;
          const rawValue = timeMatch[1];
          const rawValTrimmed = rawValue.trim();
          const milliseconds = rawValTrimmed ? Number(rawValTrimmed) || 0 : Date.now();
          onSuggestionChange({
            type: "time",
            startColonIndex: getGlobalOffsetForNodeOffset(node, localColonIdx),
            modeIndex: getGlobalOffsetForNodeOffset(node, localColonIdx + 1),
            startPayloadIndex: getGlobalOffsetForNodeOffset(node, localColonIdx + 2),
            milliseconds,
            rawValue,
          });
          return;
        }

        // 3. Mode Match
        if (textBeforeCursor.endsWith(":")) {
          onSuggestionChange({
            type: "mode",
            startColonIndex: getGlobalOffsetForNodeOffset(node, textBeforeCursor.length - 1),
          });
          return;
        }

        // 4. Unknown Match
        const unknownMatch = textBeforeCursor.match(/:([^:\s]+)$/);
        if (unknownMatch) {
          onSuggestionChange(undefined);
          return;
        }

        onSuggestionChange(undefined);
      });
    });
  }, [editor, onSuggestionChange]);

  return (
    <div className="input-field min-h-10 max-h-36 w-full flex-1 text-sm py-2 px-3 overflow-y-auto leading-relaxed relative">
      <div style={{ display: "block" }} className="w-full min-h-full">
        <ContentEditable className="outline-none min-h-full whitespace-pre-wrap break-all"/>
      </div>

      <LexicalSyncPlugin onTextChange={onTextChange}/>
    </div>
  );
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

function getGlobalOffsetForNodeOffset(targetNode: TextNode, targetOffset: number): number {
  const root = $getRoot();
  let globalOffset = 0;

  function traverse(node: LexicalNode): boolean {
    if (node === targetNode) {
      globalOffset += targetOffset;
      return true;
    }

    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        if (traverse(child)) return true;
      }
    } else {
      globalOffset += node.getTextContent().length;
    }

    return false;
  }

  traverse(root);
  return globalOffset;
}

function selectRangeByGlobalOffsets(startOffset: number, endOffset: number) {
  const root = $getRoot();
  let currentLength = 0;
  let startPoint: { node: LexicalNode; offset: number; type: 'text' | 'element' } | null = null;
  let endPoint: { node: LexicalNode; offset: number; type: 'text' | 'element' } | null = null;

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

      if ($isTextNode(node)) {
        if (!startPoint && currentLength + nodeLength >= startOffset) {
          startPoint = { node, offset: startOffset - currentLength, type: 'text' };
        }
        if (!endPoint && currentLength + nodeLength >= endOffset) {
          endPoint = { node, offset: endOffset - currentLength, type: 'text' };
        }
      } else {
        if (!startPoint && currentLength + nodeLength >= startOffset) {
          const parent = node.getParent();
          if (parent) {
            const index = parent.getChildren().indexOf(node);
            const targetOffset = startOffset <= currentLength ? index : index + 1;
            startPoint = { node: parent, offset: targetOffset, type: 'element' };
          }
        }
        if (!endPoint && currentLength + nodeLength >= endOffset) {
          const parent = node.getParent();
          if (parent) {
            const index = parent.getChildren().indexOf(node);
            const targetOffset = endOffset <= currentLength ? index : index + 1;
            endPoint = { node: parent, offset: targetOffset, type: 'element' };
          }
        }
      }

      currentLength += nodeLength;
    }
  }

  traverse(root);

  // fallbacks if offsets land at the very end of the document
  if (!startPoint) {
    const lastNode = root.getLastChild();
    if (lastNode) {
      if ($isTextNode(lastNode)) {
        startPoint = { node: lastNode, offset: lastNode.getTextContentSize(), type: 'text' };
      } else {
        const parent = lastNode.getParent();
        if (parent) {
          startPoint = { node: parent, offset: parent.getChildren().length, type: 'element' };
        }
      }
    }
  }

  if (!endPoint) {
    const lastNode = root.getLastChild();
    if (lastNode) {
      if ($isTextNode(lastNode)) {
        endPoint = { node: lastNode, offset: lastNode.getTextContentSize(), type: 'text' };
      } else {
        const parent = lastNode.getParent();
        if (parent) {
          endPoint = { node: parent, offset: parent.getChildren().length, type: 'element' };
        }
      }
    }
  }

  if (startPoint && endPoint) {
    const selection = $createRangeSelection();
    selection.anchor.set(startPoint.node.getKey(), startPoint.offset, startPoint.type);
    selection.focus.set(endPoint.node.getKey(), endPoint.offset, endPoint.type);
    $setSelection(selection);
  }
}