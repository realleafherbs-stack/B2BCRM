import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'crm-images'

export async function listImages(siteSlug: string) {
  const { data, error } = await supabase.storage.from(BUCKET).list(siteSlug, {
    sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error || !data) return []
  return data
    .filter(f => f.name !== '.emptyFolderPlaceholder')
    .map(f => ({
      name: f.name,
      url: supabase.storage.from(BUCKET).getPublicUrl(`${siteSlug}/${f.name}`).data.publicUrl,
      size: f.metadata?.size as number | undefined,
      createdAt: f.created_at ?? undefined,
    }))
}

export async function deleteImage(siteSlug: string, fileName: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([`${siteSlug}/${fileName}`])
  if (error) throw error
}

export async function uploadImage(file: File, siteSlug = 'general'): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${siteSlug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
