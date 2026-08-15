'use client'

import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  getCommunityPost,
  createCommunityReply,
  mediaUrl,
  type CommunityPostDetail,
} from '@/lib/community'

export default function CommunityPostPage() {
  const params = useParams()
  const id = params.id as string
  const [post, setPost] = useState<CommunityPostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getCommunityPost(id)
      .then(setPost)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Not found'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function submitReply(e: React.FormEvent) {
    e.preventDefault()
    if (website || !post) return
    setSubmitting(true)
    setErr('')
    try {
      await createCommunityReply(id, { author_name: authorName, body: replyBody })
      setReplyBody('')
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to reply')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#111', background: '#fafafa', minHeight: '100vh' }}>
      <SiteNav active="community" />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>
        <Link href="/community" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>← Back to community</Link>

        {loading && <p style={{ marginTop: 24, color: '#888' }}>Loading…</p>}
        {err && !loading && <p style={{ marginTop: 24, color: '#ef4444' }}>{err}</p>}

        {post && (
          <>
            <article style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 24, marginTop: 20 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, textTransform: 'uppercase', color: '#f97316' }}>{post.category}</span>
                {' · '}{post.author_name}
                {' · '}{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>{post.title}</h1>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: '#333', margin: 0, whiteSpace: 'pre-wrap' }}>{post.body}</p>
              {post.image_urls.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                  {post.image_urls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={mediaUrl(url)}
                      alt=""
                      style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid #eee' }}
                    />
                  ))}
                </div>
              )}
            </article>

            <section style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                {post.replies.length} {post.replies.length === 1 ? 'Reply' : 'Replies'}
              </h2>

              {post.replies.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10,
                    padding: '14px 16px', marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                    <strong style={{ color: '#111' }}>{r.author_name}</strong>
                    {' · '}{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{r.body}</p>
                </div>
              ))}

              <form onSubmit={submitReply} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 18, marginTop: 16 }}>
                <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Add a reply</h3>
                <input
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginBottom: 10,
                    border: '1px solid #ddd', borderRadius: 8, fontSize: 14,
                  }}
                />
                <textarea
                  required
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write your answer or comment…"
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginBottom: 12,
                    border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical',
                  }}
                />
                <button
                  type="submit"
                  disabled={submitting || !authorName.trim() || replyBody.length < 2}
                  style={{
                    padding: '10px 18px', background: '#111', color: '#fff', border: 'none',
                    borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Sending…' : 'Reply'}
                </button>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
