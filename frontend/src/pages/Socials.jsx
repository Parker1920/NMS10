import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

// Chips are derived from the posts we actually have, not hardcoded. Of the five
// scrapers only Bluesky has ever returned anything — YouTube/Twitter/Instagram
// run on stub credentials and Reddit gets 403-rate-limited — so a fixed list
// advertised five sources that were permanently empty. Deriving it means a
// source appears the moment it produces a post and never before.
const SOURCE_LABELS = {
  twitter: 'Twitter / X',
  bluesky: 'Bluesky',
  youtube: 'YouTube',
  reddit: 'Reddit',
  tiktok: 'TikTok',
  discord: 'Discord',
  instagram: 'Instagram',
}

const SOURCE_BADGE = {
  twitter: '𝕏 Twitter',
  bluesky: '☁ Bluesky',
  youtube: '▶ YouTube',
  reddit: '↗ Reddit',
  discord: '◆ Discord',
  tiktok: '♪ TikTok',
}

function timeAgo(iso) {
  if (!iso) return ''
  const ts = new Date(iso)
  if (isNaN(ts.getTime())) return ''
  const diff = (Date.now() - ts.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  return `${Math.floor(diff / 86400)} days ago`
}

function PostCard({ post }) {
  const initials = (post.author_name || '?').slice(0, 2).toUpperCase()
  return (
    <a
      className="post-card"
      href={post.external_url || '#'}
      target="_blank"
      rel="noreferrer"
      data-source={post.source}
    >
      <div className="post-header">
        <div className="post-avatar">{initials}</div>
        <div className="post-author">
          <div className="post-author-name">{post.author_name}</div>
          <div className="post-author-handle">{post.author_handle}</div>
        </div>
        <span className={`source-badge ${post.source}`}>{SOURCE_BADGE[post.source] || post.source}</span>
      </div>
      <div className="post-content">{post.content}</div>
      {post.media_path && (
        <div className="post-media">
          <img
            src={post.media_path}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
      <div className="post-footer">
        <span>{timeAgo(post.posted_at)}</span>
        <span className="post-link">Open →</span>
      </div>
    </a>
  )
}

export default function Socials() {
  const [posts, setPosts] = useState([])
  const [source, setSource] = useState('all')

  useEffect(() => {
    api('/socials').then(setPosts).catch(() => setPosts([]))
  }, [])

  const sources = useMemo(() => {
    const counts = new Map()
    for (const p of posts) counts.set(p.source, (counts.get(p.source) || 0) + 1)
    const found = [...counts.keys()].sort(
      (a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b)
    )
    // With only one source live, a lone "Bluesky" chip next to "All sources"
    // is just noise — show the filter once there's something to filter.
    if (found.length < 2) return []
    return [{ value: 'all', label: 'All sources' }].concat(
      found.map((s) => ({ value: s, label: SOURCE_LABELS[s] || s }))
    )
  }, [posts])

  // If the picked source has no posts (its last one was removed, or the feed
  // loaded after a stale selection), fall back to "all". Derived rather than
  // synced through an effect so there's no extra render and no stale frame.
  const activeSource = useMemo(
    () => (source === 'all' || posts.some((p) => p.source === source) ? source : 'all'),
    [posts, source]
  )

  // Names the live source while there's only one, so the subtitle can't claim
  // more than the feed actually delivers — and re-generalises on its own if a
  // second scraper ever starts producing.
  const meta = useMemo(() => {
    const found = [...new Set(posts.map((p) => p.source))]
    if (found.length === 1) {
      return `Live #NMS10 posts from ${SOURCE_LABELS[found[0]] || found[0]} · refreshed every few minutes`
    }
    return 'Aggregated posts from the community · refreshed every few minutes'
  }, [posts])

  const filtered = useMemo(
    () => posts.filter((p) => activeSource === 'all' || p.source === activeSource),
    [posts, activeSource]
  )

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-eyebrow">// Live Signal</div>
        <h1 className="page-title">#NMS10 Across the Stars</h1>
        <div className="page-meta">{meta}</div>
      </div>

      {sources.length > 0 && (
        <div className="filter-section">
          <div className="filter-section-label">Source</div>
          <div className="filter-bar" data-filter-group="feed">
            {sources.map((s) => (
              <button
                key={s.value}
                className={`filter-chip${activeSource === s.value ? ' active' : ''}`}
                onClick={() => setSource(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="social-wall">
        {filtered.length === 0 ? (
          <div className="no-results show">No posts match this filter.</div>
        ) : (
          filtered.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  )
}
