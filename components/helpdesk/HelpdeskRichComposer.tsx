"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"] as const;
const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Black", value: "#111827" },
  { label: "Gray", value: "#4b5563" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Green", value: "#047857" },
  { label: "Red", value: "#b91c1c" },
] as const;

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return paragraphs || "<p></p>";
}

type HelpdeskRichComposerProps = {
  html: string;
  onChange: (next: { html: string; text: string }) => void;
  placeholder?: string;
  className?: string;
  /** Bump to force editor content sync (e.g. after inserting a macro). */
  contentKey?: number;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={active ? "secondary" : "ghost"}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("shrink-0", active && "bg-muted")}
    >
      {children}
    </Button>
  );
}

export function HelpdeskRichComposer({
  html,
  onChange,
  placeholder = "Write your message…",
  className,
  contentKey = 0,
}: HelpdeskRichComposerProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      TextStyleKit.configure({
        backgroundColor: false,
        fontFamily: false,
        lineHeight: false,
      }),
      TextAlign.configure({ types: ["paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: html || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[140px] px-3 py-2 focus:outline-none [&_p]:my-1",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange({
        html: ed.getHTML(),
        text: ed.getText({ blockSeparator: "\n" }).trim(),
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = html || "<p></p>";
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contentKey drives external macro sync
  }, [contentKey, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-muted/20 px-3 py-8 text-sm text-muted-foreground",
          className
        )}
      >
        Loading editor…
      </div>
    );
  }

  const currentSize = (editor.getAttributes("textStyle").fontSize as string | undefined) || "14px";
  const currentColor = (editor.getAttributes("textStyle").color as string | undefined) || "";

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1">
        <ToolbarButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Select
          value={currentSize}
          onValueChange={(v) => {
            if (!v) return;
            editor.chain().focus().setFontSize(v).run();
          }}
        >
          <SelectTrigger className="h-7 w-[88px] text-xs" aria-label="Font size">
            <SelectValue>{(value: string | null) => value ?? "14px"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size.replace("px", "")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentColor || "__default"}
          onValueChange={(v) => {
            if (!v || v === "__default") {
              editor.chain().focus().unsetColor().run();
              return;
            }
            editor.chain().focus().setColor(v).run();
          }}
        >
          <SelectTrigger className="h-7 w-[110px] text-xs" aria-label="Text color">
            <SelectValue>
              {(value: string | null) => {
                if (!value || value === "__default") return "Color";
                const match = TEXT_COLORS.find((c) => c.value === value);
                return match?.label ?? "Color";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TEXT_COLORS.map((color) => (
              <SelectItem key={color.label} value={color.value || "__default"}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm border border-border"
                    style={{ backgroundColor: color.value || "transparent" }}
                  />
                  {color.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          label="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
