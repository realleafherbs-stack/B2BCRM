'use client'
import { useState } from 'react'
import Image from 'next/image'

export function ImageUpload({
  name,
  label,
  defaultValue,
}: {
  name: string
  label: string
  defaultValue?: string | null
}) {
  const [url, setUrl] = useState(defaultValue ?? '')
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUrl(data.url)
    setUploading(false)
  }

  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2 uppercase tracking-wide">{label}</label>
      <input type="hidden" name={name} value={url} />
      {url ? (
        <div className="relative">
          <Image src={url} alt="uploaded" width={320} height={180} className="rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => setUrl('')}
            className="mt-2 text-sm text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center w-full border-2 border-dashed border-slate-700 rounded-xl py-8 cursor-pointer hover:border-indigo-500 transition-colors">
          <span className="text-slate-400 text-base">
            {uploading ? 'Uploading...' : 'Click to upload image'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      )}
    </div>
  )
}
