'use client'
import { useState } from 'react'
import { ImageUpload } from './image-upload'

export function SeoPanel({
  defaultMetaTitle,
  defaultMetaDescription,
  defaultOgImage,
}: {
  defaultMetaTitle?: string | null
  defaultMetaDescription?: string | null
  defaultOgImage?: string | null
}) {
  const [metaTitle, setMetaTitle] = useState(defaultMetaTitle ?? '')
  const [metaDesc, setMetaDesc] = useState(defaultMetaDescription ?? '')

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Meta Title</label>
        <input
          name="metaTitle"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          maxLength={60}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500"
        />
        <p className="text-slate-500 text-sm mt-1">{metaTitle.length} / 60</p>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">Meta Description</label>
        <textarea
          name="metaDescription"
          value={metaDesc}
          onChange={(e) => setMetaDesc(e.target.value)}
          maxLength={160}
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-indigo-500 resize-none"
        />
        <p className="text-slate-500 text-sm mt-1">{metaDesc.length} / 160</p>
      </div>
      <ImageUpload name="ogImage" label="OG Image" defaultValue={defaultOgImage} />
    </div>
  )
}
