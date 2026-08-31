"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-32 max-h-56 overflow-y-auto px-3 py-2 outline-none prose prose-sm max-w-none text-ink",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className="mt-1 rounded-lg border border-mist bg-white focus-within:border-sage focus-within:ring-2 focus-within:ring-sage/20">
      <div className="flex gap-1 border-b border-mist px-2 py-1.5">
        <ToolbarBtn
          label="B"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarBtn
          label="I"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarBtn
          label="•"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
      </div>
      {!value && placeholder ? (
        <p className="pointer-events-none absolute px-3 pt-2 text-sm text-ink/35">
          {placeholder}
        </p>
      ) : null}
      <div className="relative min-h-32">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 min-w-9 rounded px-2 text-sm font-medium ${
        active ? "bg-sage/15 text-sage" : "text-ink/60 hover:bg-mist/60"
      }`}
    >
      {label}
    </button>
  );
}
