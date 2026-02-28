"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Heading from "@tiptap/extension-heading"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import Image from "@tiptap/extension-image"
import { useEffect } from "react"
import { cn } from "@/lib/utils"

interface RichTextDisplayProps {
  content: string
  className?: string
}

export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      TextStyle,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
    ],
    content: content || '<p></p>',
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none",
          "dark:prose-invert prose-p:my-0 prose-headings:my-1.5",
          "prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
          "prose-blockquote:my-1.5 prose-code:my-0.5",
          "prose-pre:my-1.5 prose-table:my-1.5",
          "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
          "prose-h4:text-base prose-h5:text-sm prose-h6:text-xs",
          "prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg",
          className
        ),
      },
    },
  })

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor) {
      try {
        const currentHTML = editor.getHTML()
        if (content !== currentHTML) {
          editor.commands.setContent(content)
        }
      } catch (error) {
        console.warn('Failed to set editor content:', error)
      }
    }
  }, [content, editor])

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [editor])

  if (!editor) {
    return (
      <div className={cn("animate-pulse bg-gray-100 dark:bg-gray-800 rounded p-4", className)}>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    )
  }

  return (
    <div className="rich-text-display">
      <EditorContent editor={editor} />
    </div>
  )
}