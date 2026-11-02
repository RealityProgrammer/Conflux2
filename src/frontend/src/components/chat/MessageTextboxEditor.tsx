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
  mergeRegister, KEY_TAB_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND, $getNodeByKey, ParagraphNode,
  type UpdateListenerPayload, PASTE_COMMAND, COMMAND_PRIORITY_HIGH, type PasteCommandType,
} from "lexical";
import {RichTextExtension} from "@lexical/rich-text";
import {HistoryExtension} from "@lexical/history";
import {ContentEditable} from "@lexical/react/LexicalContentEditable";
import {OnChangePlugin} from "@lexical/react/LexicalOnChangePlugin";
import {useLexicalComposerContext} from "@lexical/react/LexicalComposerContext";
import {useEffect, type Ref, useRef, useImperativeHandle, type RefObject} from "react";
import {
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_LOW,
  type LexicalEditor,
  TextNode,
  $createRangeSelection,
  $setSelection
} from "lexical";
import {$createEmojiNode, EmojiDecoratorNode} from "./nodes/EmojiDecoratorNode.tsx";
import {$createTimestampNode, TimestampDecoratorNode} from "./nodes/TimestampDecoratorNode.tsx";
import {findMatchingEmoji} from "../../hooks/useUserEmojis.ts";
import { ListNode, ListItemNode, registerList, $isListItemNode, registerCheckList } from "@lexical/list";
import { HeadingNode, QuoteNode, $isQuoteNode } from "@lexical/rich-text";
import { CodeNode, CodeHighlightNode, $isCodeNode, $createCodeNode, CodeExtension } from "@lexical/code-core";
import {
  registerMarkdownShortcuts,
  $convertToMarkdownString,
  HEADING,
  QUOTE,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  INLINE_CODE,
  CODE,
} from "@lexical/markdown";
import {
  LinkNode,
  AutoLinkNode,
  registerAutoLink,
  type LinkMatcher,
  createLinkMatcherWithRegExp
} from "@lexical/link";
import {$createMarkdownMarkerNode, $isMarkdownMarkerNode, MarkdownMarkerNode} from "./nodes/MarkdownMarkerNode.tsx";
import {$createMentionNode, MentionDecoratorNode} from "./nodes/MentionDecoratorNode.tsx";

export type SuggestionData =
  { type: "mode"; startColonIndex: number } |
  { type: "emoji"; startColonIndex: number; modeIndex: number; startPayloadIndex: number; searchTerm: string; } |
  { type: "time"; startColonIndex: number; modeIndex: number; startPayloadIndex: number; milliseconds: number; rawValue: string; } |
  { type: "mention", startColonIndex: number; modeIndex: number; startPayloadIndex: number; searchTerm: string; };

export interface MessageTextboxEditorRef {
  reset: () => void;
  focus: () => void;
  insertText: (text: string, startOffset: number, endOffset: number) => void;
  insertEmojiNode: (emojiId: string, startOffset: number, endOffset: number) => void;
  insertMentionNode: (user: { id: string; name: string }, startOffset: number, endOffset: number) => void;
  convertToMarkdownString: () => string;
  insertAtLastSelection: (content: string | (() => LexicalNode)) => void;
}

interface MessageTextboxEditorProps {
  onTextChange: (text: string, cursorPosition: number) => void;
  onEnterSend: () => void;
  onSuggestionChange: (data: SuggestionData | undefined) => void;
  onImagePaste: (file: File) => void;
  ref?: Ref<MessageTextboxEditorRef>;
}

const URL_MATCHER = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)([A-Za-z0-9.-]+\.[a-z]{2,}(?:\/[+~%\/.\w-_]*)?\??[-+=&;%@.\w_]*#?\w*)?)/i;

const LINK_MATCHERS: LinkMatcher[] = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) => {
    // prepend https:// if missing from a domain link like "google.com"
    return text.startsWith("http") ? text : `https://${text}`;
  }),
];

export function registerMarkdownSyntaxHighlighter(editor: LexicalEditor) {
  return editor.registerUpdateListener(({ editorState, dirtyElements, tags }: UpdateListenerPayload) => {
    if (tags.has("markdown-highlight")) {
      return;
    }

    let hasParagraphChanges = false;
    editorState.read(() => {
      for (const [nodeKey] of dirtyElements) {
        const node = $getNodeByKey(nodeKey);
        if ($isParagraphNode(node)) {
          hasParagraphChanges = true;
          break;
        }
      }
    });

    if (!hasParagraphChanges) return;

    editor.update(() => {
      const selection = $getSelection();
      let savedAnchorOffset = -1;
      let savedFocusOffset = -1;

      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const focusNode = selection.focus.getNode();

        for (const [nodeKey] of dirtyElements) {
          const paragraph = $getNodeByKey(nodeKey);
          if ($isParagraphNode(paragraph)) {
            if (paragraph.isParentOf(anchorNode) || paragraph === anchorNode) {
              savedAnchorOffset = getAbsoluteOffset(paragraph, anchorNode, selection.anchor.offset);
            }
            if (paragraph.isParentOf(focusNode) || paragraph === focusNode) {
              savedFocusOffset = getAbsoluteOffset(paragraph, focusNode, selection.focus.offset);
            }
          }
        }
      }

      for (const [nodeKey] of dirtyElements) {
        const paragraph = $getNodeByKey(nodeKey);

        if (!$isParagraphNode(paragraph) || !paragraph.isAttached()) {
          continue;
        }

        processParagraph(paragraph);
      }

      if (savedAnchorOffset !== -1 && $isRangeSelection(selection)) {
        for (const [nodeKey] of dirtyElements) {
          const paragraph = $getNodeByKey(nodeKey);
          if ($isParagraphNode(paragraph) && paragraph.isAttached()) {
            restoreSelection(paragraph, savedAnchorOffset, savedFocusOffset !== -1 ? savedFocusOffset : savedAnchorOffset);
            break;
          }
        }
      }
    }, { tag: "markdown-highlight" });
  });
}

function getAbsoluteOffset(paragraph: ParagraphNode, targetNode: LexicalNode, localOffset: number): number {
  let offset = 0;
  let found = false;
  for (const child of paragraph.getChildren()) {
    if (child === targetNode) {
      offset += localOffset;
      found = true;
      break;
    }
    offset += child.getTextContentSize();
  }
  return found ? offset : 0;
}

function restoreSelection(paragraph: ParagraphNode, targetAnchorOffset: number, targetFocusOffset: number) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const children = paragraph.getChildren();
  if (children.length === 0) return;

  let anchorNode: TextNode | null = null;
  let anchorLocal = 0;
  let focusNode: TextNode | null = null;
  let focusLocal = 0;

  let currentOffset = 0;
  for (const child of children) {
    if (!$isTextNode(child)) continue;
    const size = child.getTextContentSize();

    if (!anchorNode && targetAnchorOffset <= currentOffset + size) {
      anchorNode = child;
      anchorLocal = targetAnchorOffset - currentOffset;
    }
    if (!focusNode && targetFocusOffset <= currentOffset + size) {
      focusNode = child;
      focusLocal = targetFocusOffset - currentOffset;
    }
    currentOffset += size;
  }

  // Fallback to end of paragraph if offsets exceed bounds
  if (!anchorNode && children.length > 0) {
    const last = children[children.length - 1];
    if ($isTextNode(last)) {
      anchorNode = last;
      anchorLocal = last.getTextContentSize();
    }
  }
  if (!focusNode && children.length > 0) {
    const last = children[children.length - 1];
    if ($isTextNode(last)) {
      focusNode = last;
      focusLocal = last.getTextContentSize();
    }
  }

  if (anchorNode && focusNode) {
    selection.anchor.set(anchorNode.__key, anchorLocal, "text");
    selection.focus.set(focusNode.__key, focusLocal, "text");
  }
}

function processParagraph(paragraph: ParagraphNode) {
  // clean everything
  const children = paragraph.getChildren();
  children.forEach((child) => {
    if ($isMarkdownMarkerNode(child)) {
      const normalTextNode = new TextNode(child.getTextContent());
      child.replace(normalTextNode);
    } else if ($isTextNode(child)) {
      child.setStyle("");
      if (child.hasFormat("bold")) child.toggleFormat("bold");
      if (child.hasFormat("italic")) child.toggleFormat("italic");
      if (child.hasFormat("strikethrough")) child.toggleFormat("strikethrough");
      if (child.hasFormat("underline")) child.toggleFormat("underline");
      if (child.hasFormat("code")) child.toggleFormat("code");
    }
  });

  // merge everything into 1 unify text node
  let updatedChildren = paragraph.getChildren();
  while (updatedChildren.length > 1) {
    let merged = false;
    for (let i = 0; i < updatedChildren.length - 1; i++) {
      const current = updatedChildren[i];
      const next = updatedChildren[i + 1];
      if ($isTextNode(current) && $isTextNode(next)) {
        current.setTextContent(current.getTextContent() + next.getTextContent());
        next.remove();
        merged = true;
        break;
      }
    }
    if (!merged) break;
    updatedChildren = paragraph.getChildren();
  }

  // begin parsing
  const fullText = paragraph.getTextContent();
  if (fullText.trim() === "") {
    return;
  }

  const pattern = /(?<!\\)(\*\*\*|___|\*\*|__|~~|(?<!\*)\*(?!\*)|(?<!_)_(?!_))(.*?)(\1)/g;
  const matches = [...fullText.matchAll(pattern)];

  if (matches.length === 0) {
    return;
  }

  // sort matches from right to left (descending index) so splits don't shift earlier indices
  matches.sort((a, b) => b.index! - a.index!);

  for (const match of matches) {
    const marker = match[1];
    const innerText = match[2];

    if (!innerText || innerText.trim() === "") {
      continue;
    }

    const fullMatch = match[0];
    const index = match.index!;

    if (index > 0 && fullText[index - 1] === "\\") {
      continue;
    }

    const formatsToApply: ("bold" | "italic" | "strikethrough" | "underline")[] = [];
    if (marker === "*" || marker === "_") {
      formatsToApply.push("italic");
    } else if (marker === "**") {
      formatsToApply.push("bold");
    } else if (marker === "__") {
      formatsToApply.push("underline");
    } else if (marker === "~~") {
      formatsToApply.push("strikethrough");
    } else if (marker === "***" || marker === "___") {
      formatsToApply.push("bold", "italic");
    }

    // locate the target node covering the match index
    let currentLength = 0;
    let targetNode: TextNode | null = null;
    let matchOffset = 0;

    const currentParagraphChildren = paragraph.getChildren();
    for (const child of currentParagraphChildren) {
      if (!$isTextNode(child)) continue;
      const nodeLength = child.getTextContentSize();
      if (index >= currentLength && index < currentLength + nodeLength) {
        targetNode = child;
        matchOffset = index - currentLength;
        break;
      }
      currentLength += nodeLength;
    }

    if (!targetNode || $isMarkdownMarkerNode(targetNode)) {
      continue;
    }

    if (matchOffset > 0) {
      const splitBefore = targetNode.splitText(matchOffset);
      if (splitBefore.length < 2) continue;
      targetNode = splitBefore[1];
    }

    if (targetNode.getTextContentSize() > fullMatch.length) {
      const splitAfter = targetNode.splitText(fullMatch.length);
      if (splitAfter.length < 1) continue;
      targetNode = splitAfter[0];
    }

    // split into [open marker][inner text][close marker]
    const markerLen = marker.length;
    const split1 = targetNode.splitText(markerLen);
    if (split1.length < 2) continue;
    const openMarkerTextNode = split1[0];
    const innerAndClose = split1[1];

    const innerLen = innerText.length;
    const split2 = innerAndClose.splitText(innerLen);
    if (split2.length < 2) continue;
    const innerNode = split2[0];
    const closeMarkerTextNode = split2[1];

    if (!openMarkerTextNode || !innerNode || !closeMarkerTextNode) {
      continue;
    }

    const openMarkerNode = $createMarkdownMarkerNode(marker);
    const closeMarkerNode = $createMarkdownMarkerNode(marker);

    openMarkerTextNode.replace(openMarkerNode);
    closeMarkerTextNode.replace(closeMarkerNode);

    for (const fmt of formatsToApply) {
      if (!innerNode.hasFormat(fmt)) {
        innerNode.toggleFormat(fmt);
      }
    }
  }
}

const CHAT_MARKDOWN_TRANSFORMERS = [
  HEADING,
  QUOTE,
  CHECK_LIST,       // must be before UNORDERED_LIST and ORDERED_LIST
  UNORDERED_LIST,
  ORDERED_LIST,
  INLINE_CODE,
  CODE,
];

export const MarkdownShortcutsExtension = defineExtension({
  name: "MarkdownShortcutsExtension",
  nodes: () => [
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    CodeHighlightNode,
    MarkdownMarkerNode,
  ],
  register(editor) {
    return mergeRegister(
      registerCheckList(editor),
      registerList(editor),
      registerMarkdownShortcuts(editor, CHAT_MARKDOWN_TRANSFORMERS),
    );
  },
});

export const MarkdownSyntaxExtension = defineExtension({
  name: "MarkdownSyntaxExtension",
  register(editor) {
    return registerMarkdownSyntaxHighlighter(editor);
  },
});

export const CustomTransformExtension = defineExtension({
  name: "CustomTransformExtension",
  nodes: () => [EmojiDecoratorNode, TimestampDecoratorNode, MentionDecoratorNode],
  register(editor) {
    return editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      if (!textNode.isAttached()) return;

      const text = textNode.getTextContent();

      // codeblock match
      const codeFenceMatch = text.match(/(?:^|\n)```([\w-]*)\s$/);
      if (codeFenceMatch) {
        const fullMatch = codeFenceMatch[0];
        const language = codeFenceMatch[1] || "";
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

      const emojiMatch = text.match(/:e([\w-]+):/);
      if (emojiMatch) {
        const fullMatch = emojiMatch[0];
        const searchTerm = emojiMatch[1];
        const index = emojiMatch.index!;

        const matchedEmoji = findMatchingEmoji(searchTerm);

        if (!matchedEmoji) return;

        let targetNode = textNode;

        // isolate the shortcode by splitting before and after it
        if (index > 0) {
          [, targetNode] = targetNode.splitText(index);
        }

        if (targetNode.getTextContentSize() > fullMatch.length) {
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
        if (targetNode.getTextContentSize() > fullMatch.length) {
          targetNode.splitText(fullMatch.length);
        }

        const timeNode = $createTimestampNode(Number(timestampStr));
        targetNode.replace(timeNode);
        return;
      }

      const mentionMatch = text.match(/:m([\da-f\-]+):/);
      if (mentionMatch) {
        const fullMatch = mentionMatch[0];
        const searchTerm = mentionMatch[1]; // could be either id or shortcode
        const index = mentionMatch.index!;

        let targetNode = textNode;

        if (index > 0) {
          [, targetNode] = targetNode.splitText(index);
        }

        if (targetNode.getTextContentSize() > fullMatch.length) {
          targetNode.splitText(fullMatch.length);
        }

        const mentionNode = $createMentionNode(searchTerm);
        targetNode.replace(mentionNode);
        return;
      }
    });
  },
});

export const LinkExtension = defineExtension({
  name: "LinkExtension",
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
    MarkdownSyntaxExtension,
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
        listitem: "list-none",
      },
    },
    text: {
      bold: "message-bold",
      italic: "message-italic",
      code: "message-inline-code",
      strikethrough: "line-through",
      underline: "underline",
      underlineStrikethrough: "underline line-through",
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
  onImagePaste,
  ref,
}: MessageTextboxEditorProps) {
  const editorRef = useRef<LexicalEditor | null>(null);
  const lastSelectionRef = useRef<{ nodeKey: string; offset: number } | null>(null);

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
          emojiNode.insertAfter($createTextNode(" "));
        }
      });
    },
    insertMentionNode: (user: { id: string; name: string }, startOffset: number, endOffset: number) => {
      editorRef.current?.update(() => {
        selectRangeByGlobalOffsets(startOffset, endOffset);
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          const mentionNode = $createMentionNode(user.id, user.name);
          selection.insertNodes([mentionNode]);
          mentionNode.insertAfter($createTextNode(" "));
        }
      });
    },
    convertToMarkdownString: (): string => {
      return editorRef.current?.read(() => {
        return $convertToMarkdownString(CHAT_MARKDOWN_TRANSFORMERS);
      }) ?? "";
    },
    insertAtLastSelection: (content: string | (() => LexicalNode)) => {
      editorRef.current?.update(() => {
        const saved = lastSelectionRef.current;

        if (saved) {
          const node = $getNodeByKey(saved.nodeKey);

          if (node && $isTextNode(node)) {
            const selection = $createRangeSelection();

            selection.anchor.set(node.__key, saved.offset, "text");
            selection.focus.set(node.__key, saved.offset, "text");
            $setSelection(selection);

            if (typeof content === "string") {
              selection.insertText(content);
            } else {
              selection.insertNodes([content()]);
            }
            return;
          }
        }

        editorRef.current?.focus();
        const fallbackSelection = $getSelection();
        if ($isRangeSelection(fallbackSelection)) {
          if (typeof content === "string") {
            fallbackSelection.insertText(content);
          } else {
            fallbackSelection.insertNodes([content()]);
          }
        }
      });
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
          onImagePaste={onImagePaste}
          lastSelectionRef={lastSelectionRef}
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
  onImagePaste: (file: File) => void;
  lastSelectionRef: RefObject<{ nodeKey: string; offset: number } | null>; // 👈 Added prop type
}

function TextArea({
  onTextChange,
  onEnterSend,
  onEditorReady,
  onSuggestionChange,
  onImagePaste,
  lastSelectionRef,
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

  // paste image command
  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: PasteCommandType) => {
        if (!(event instanceof ClipboardEvent) || !event.clipboardData) {
          return false;
        }

        const items = event.clipboardData.items;
        if (!items) return false;

        let hasHandledImage = false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Check if the pasted item is an image
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();

            if (file) {
              event.preventDefault();
              onImagePaste(file);
              hasHandledImage = true;
            }
          }
        }

        return hasHandledImage;
      },
      COMMAND_PRIORITY_HIGH
    )
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

        // suggestions only occur inside normal text nodes
        if (!$isTextNode(node)) {
          onSuggestionChange(undefined);
          return;
        }

        const textBeforeCursor = node.getTextContent().slice(0, anchor.offset);

        // TODO: Prevent suggestion inside Codeblock
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

        const mentionMatch = textBeforeCursor.match(/:m(.*)$/);
        if (mentionMatch) {
          const localColonIdx = mentionMatch.index!;
          onSuggestionChange({
            type: "mention",
            startColonIndex: getGlobalOffsetForNodeOffset(node, localColonIdx),
            modeIndex: getGlobalOffsetForNodeOffset(node, localColonIdx + 1),
            startPayloadIndex: getGlobalOffsetForNodeOffset(node, localColonIdx + 2),
            searchTerm: mentionMatch[1] || "",
          });
          return;
        }

        if (textBeforeCursor.endsWith(":")) {
          onSuggestionChange({
            type: "mode",
            startColonIndex: getGlobalOffsetForNodeOffset(node, textBeforeCursor.length - 1),
          });
          return;
        }

        onSuggestionChange(undefined);
      });
    });
  }, [editor, onSuggestionChange]);

  // track last known cursor position
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection) && selection.isCollapsed()) {
          const anchor = selection.anchor;
          lastSelectionRef.current = {
            nodeKey: anchor.key,
            offset: anchor.offset,
          };
        }
      });
    });
  }, [editor, lastSelectionRef]);

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
          globalOffset += children[i].getTextContentSize();
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
      globalOffset += node.getTextContentSize();
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
      globalOffset += node.getTextContentSize();
    }

    return false;
  }

  traverse(root);
  return globalOffset;
}

function selectRangeByGlobalOffsets(startOffset: number, endOffset: number) {
  const root = $getRoot();
  let currentLength = 0;
  let startPoint: { node: LexicalNode; offset: number; type: "text" | "element" } | null = null;
  let endPoint: { node: LexicalNode; offset: number; type: "text" | "element" } | null = null;

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
          startPoint = { node, offset: startOffset - currentLength, type: "text" };
        }
        if (!endPoint && currentLength + nodeLength >= endOffset) {
          endPoint = { node, offset: endOffset - currentLength, type: "text" };
        }
      } else {
        if (!startPoint && currentLength + nodeLength >= startOffset) {
          const parent = node.getParent();
          if (parent) {
            const index = parent.getChildren().indexOf(node);
            const targetOffset = startOffset <= currentLength ? index : index + 1;
            startPoint = { node: parent, offset: targetOffset, type: "element" };
          }
        }
        if (!endPoint && currentLength + nodeLength >= endOffset) {
          const parent = node.getParent();
          if (parent) {
            const index = parent.getChildren().indexOf(node);
            const targetOffset = endOffset <= currentLength ? index : index + 1;
            endPoint = { node: parent, offset: targetOffset, type: "element" };
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
        startPoint = { node: lastNode, offset: lastNode.getTextContentSize(), type: "text" };
      } else {
        const parent = lastNode.getParent();
        if (parent) {
          startPoint = { node: parent, offset: parent.getChildren().length, type: "element" };
        }
      }
    }
  }

  if (!endPoint) {
    const lastNode = root.getLastChild();
    if (lastNode) {
      if ($isTextNode(lastNode)) {
        endPoint = { node: lastNode, offset: lastNode.getTextContentSize(), type: "text" };
      } else {
        const parent = lastNode.getParent();
        if (parent) {
          endPoint = { node: parent, offset: parent.getChildren().length, type: "element" };
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