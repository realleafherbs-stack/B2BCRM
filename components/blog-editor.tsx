'use client'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import { useState } from 'react'

// Extend Image to support a float alignment attribute
const Image = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        renderHTML(attrs) {
          if (attrs.align === 'left')   return { style: 'float:left; margin:0 1.5em 1em 0;' }
          if (attrs.align === 'right')  return { style: 'float:right; margin:0 0 1em 1.5em;' }
          if (attrs.align === 'center') return { style: 'display:block; margin:0 auto;' }
          return {}
        },
        parseHTML(el) {
          const s = el.getAttribute('style') ?? ''
          if (s.includes('float:left') || s.includes('float: left'))   return 'left'
          if (s.includes('float:right') || s.includes('float: right')) return 'right'
          if (s.includes('margin:0 auto') || s.includes('margin: 0 auto')) return 'center'
          return null
        },
      },
    }
  },
}).configure({ resize: { enabled: true, minWidth: 80 } })

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
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
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
      Image,
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

  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold:       ctx.editor?.isActive('bold') ?? false,
      isItalic:     ctx.editor?.isActive('italic') ?? false,
      isH1:         ctx.editor?.isActive('heading', { level: 1 }) ?? false,
      isH2:         ctx.editor?.isActive('heading', { level: 2 }) ?? false,
      isH3:         ctx.editor?.isActive('heading', { level: 3 }) ?? false,
      isBulletList: ctx.editor?.isActive('bulletList') ?? false,
      isImage:      ctx.editor?.isActive('image') ?? false,
      imageAlign:   ctx.editor?.getAttributes('image').align ?? null,
    }),
  })

  function setImageAlign(align: 'left' | 'center' | 'right' | null) {
    editor?.chain().focus().updateAttributes('image', { align }).run()
  }

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
      <div className="bg-slate-900 border border-slate-700 rounded-xl">
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700 flex-wrap">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={state?.isBold}>
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={state?.isItalic}>
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={state?.isH1}>
            H1
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={state?.isH2}>
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={state?.isH3}>
            H3
          </ToolbarButton>
          <span className="w-px h-5 bg-slate-600 mx-1" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={state?.isBulletList}>
            • List
          </ToolbarButton>
          <ToolbarButton onClick={insertImage}>🖼 Image</ToolbarButton>
          {state?.isImage && (
            <>
              <span className="w-px h-5 bg-slate-600 mx-1" />
              <ToolbarButton onClick={() => setImageAlign('left')} active={state.imageAlign === 'left'}>
                ⬅ Left
              </ToolbarButton>
              <ToolbarButton onClick={() => setImageAlign('center')} active={state.imageAlign === 'center'}>
                ⬛ Center
              </ToolbarButton>
              <ToolbarButton onClick={() => setImageAlign('right')} active={state.imageAlign === 'right'}>
                Right ➡
              </ToolbarButton>
              <ToolbarButton onClick={() => setImageAlign(null)} active={state.imageAlign === null}>
                ↔ Full
              </ToolbarButton>
              <span className="w-px h-5 bg-slate-600 mx-1" />
              <ToolbarButton onClick={() => editor?.chain().focus().deleteSelection().run()}>
                🗑 Remove
              </ToolbarButton>
            </>
          )}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
