"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Heading, { Level } from "@tiptap/extension-heading"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import Image from "@tiptap/extension-image"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Link as LinkIcon,
  RemoveFormatting,
  Heading as HeadingIcon,
  Palette,
  Image as ImageIcon,
  ChevronDown
} from "lucide-react"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Start typing...",
  className
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
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
    content: value || '<p></p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          "focus:outline-none",
          "min-h-[100px]",
          "max-h-[200px]",
          "overflow-y-auto",
          "p-3",
          "leading-relaxed"
        ),
      },
    },
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor) {
      try {
        const currentHTML = editor.getHTML()
        if (value !== currentHTML) {
          editor.commands.setContent(value)
        }
      } catch (error) {
        console.warn('Failed to set editor content:', error)
      }
    }
  }, [value, editor])

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [editor])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedHeading, setSelectedHeading] = useState("p")
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const MAX_IMAGE_WIDTH = 1920
  const MAX_IMAGE_HEIGHT = 1080

  // Update heading selection when editor changes
  useEffect(() => {
    if (editor) {
      const updateHeading = () => {
        if (editor.isActive('heading', { level: 1 })) setSelectedHeading('h1')
        else if (editor.isActive('heading', { level: 2 })) setSelectedHeading('h2')
        else if (editor.isActive('heading', { level: 3 })) setSelectedHeading('h3')
        else if (editor.isActive('heading', { level: 4 })) setSelectedHeading('h4')
        else if (editor.isActive('heading', { level: 5 })) setSelectedHeading('h5')
        else if (editor.isActive('heading', { level: 6 })) setSelectedHeading('h6')
        else setSelectedHeading('p')
      }

      editor.on('selectionUpdate', updateHeading)
      editor.on('transaction', updateHeading)
      
      return () => {
        editor.off('selectionUpdate', updateHeading)
        editor.off('transaction', updateHeading)
      }
    }
  }, [editor])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && editor) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`)
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const src = e.target?.result as string

        // Create an image to validate dimensions
        const img = new (window as any).Image()
        img.onload = () => {
          // Resize if too large
          if (img.width > MAX_IMAGE_WIDTH || img.height > MAX_IMAGE_HEIGHT) {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (ctx) {
              let width = img.width
              let height = img.height

              // Calculate dimensions maintaining aspect ratio
              if (width > MAX_IMAGE_WIDTH) {
                height = (height * MAX_IMAGE_WIDTH) / width
                width = MAX_IMAGE_WIDTH
              }
              if (height > MAX_IMAGE_HEIGHT) {
                width = (width * MAX_IMAGE_HEIGHT) / height
                height = MAX_IMAGE_HEIGHT
              }

              canvas.width = width
              canvas.height = height
              ctx.drawImage(img, 0, 0, width, height)
              const resizedSrc = canvas.toDataURL('image/jpeg', 0.8)
              editor.chain().focus().setImage({ src: resizedSrc }).run()
            }
          } else {
            editor.chain().focus().setImage({ src }).run()
          }
        }
        img.onerror = () => {
          alert('Failed to load image')
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const MenuBar = () => {
    if (!editor) return null

    return (
      <div className="flex flex-wrap items-center gap-1 p-2 border-b">
        {/* Heading Dropdown */}
        <Select value={selectedHeading} onValueChange={(value) => {
          if (value === 'p') {
            editor.chain().focus().setParagraph().run()
          } else {
            const level = parseInt(value.replace('h', '')) as Level
            editor.chain().focus().setHeading({ level }).run()
          }
        }}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Normal</SelectItem>
            <SelectItem value="h1">H1</SelectItem>
            <SelectItem value="h2">H2</SelectItem>
            <SelectItem value="h3">H3</SelectItem>
            <SelectItem value="h4">H4</SelectItem>
            <SelectItem value="h5">H5</SelectItem>
            <SelectItem value="h6">H6</SelectItem>
          </SelectContent>
        </Select>

        {/* Text Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-accent" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-accent" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={editor.isActive("textStyle") ? "bg-accent" : ""}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-6 gap-2">
              {[
                '#000000', '#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#d97706'
              ].map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().unsetColor().run()}
              >
                Reset
              </Button>
              <span className="text-xs text-muted-foreground">Click to apply color</span>
            </div>
          </PopoverContent>
        </Popover>

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-accent" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-accent" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        {/* Quote */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "bg-accent" : ""}
        >
          <Quote className="h-4 w-4" />
        </Button>

        {/* Link */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt("Enter URL:")
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={editor.isActive("link") ? "bg-accent" : ""}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        {/* Image */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Remove Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>

        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      <MenuBar />
      <div className="border rounded-md min-h-[200px] max-h-[300px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}