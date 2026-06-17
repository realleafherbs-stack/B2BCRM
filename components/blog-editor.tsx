'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import { useState } from 'react'

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-base transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

export function BlogEditor({ defaultValue }: { defaultValue?: string }) {
  const [content, setContent] = useState(defaultValue ?? '')

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage,
      TiptapLink.configure({ openOnClick: false }),
    ],
    content: defaultValue ?? '',
    onUpdate({ editor }) {
      setContent(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[240px] p-4 text-base text-slate-200 focus:outline-none',
      },
    },
  })

  async function insertImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file || !editor) return
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      editor.chain().focus().setImage({ src: data.url }).run()
    }
    input.click()
  }

  return (
    <div>
      <input type="hidden" name="body" value={content} />
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700 flex-wrap">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}>
            H1
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
            • List
          </ToolbarButton>
          <ToolbarButton onClick={insertImage}>🖼 Image</ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
