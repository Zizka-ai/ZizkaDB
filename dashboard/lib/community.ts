import { API } from './api'

export type CommunityCategory = 'question' | 'experience' | 'showcase'

export interface CommunityPostListItem {
  id: string
  author_name: string
  category: CommunityCategory
  title: string
  excerpt: string
  image_urls: string[]
  reply_count: number
  created_at: string
}

export interface CommunityReply {
  id: string
  author_name: string
  body: string
  created_at: string
}

export interface CommunityPostDetail extends CommunityPostListItem {
  body: string
  replies: CommunityReply[]
}

async function communityFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err.detail
    throw new Error(typeof detail === 'string' ? detail : 'Request failed')
  }
  return res.json()
}

export function listCommunityPosts(category?: CommunityCategory) {
  const qs = category ? `?category=${category}` : ''
  return communityFetch(`/v1/community/posts${qs}`) as Promise<CommunityPostListItem[]>
}

export function getCommunityPost(id: string) {
  return communityFetch(`/v1/community/posts/${id}`) as Promise<CommunityPostDetail>
}

export function createCommunityPost(payload: {
  author_name: string
  author_email?: string
  category: CommunityCategory
  title: string
  body: string
  image_urls: string[]
}) {
  return communityFetch('/v1/community/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, website: '' }),
  }) as Promise<{ id: string }>
}

export function createCommunityReply(
  postId: string,
  payload: { author_name: string; author_email?: string; body: string },
) {
  return communityFetch(`/v1/community/posts/${postId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, website: '' }),
  })
}

export async function uploadCommunityImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/v1/community/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err.detail ?? 'Upload failed')
  }
  const data = await res.json() as { url: string }
  return data.url
}

export function mediaUrl(path: string) {
  if (path.startsWith('http')) return path
  return `${API}${path}`
}
