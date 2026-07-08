"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BRAND } from "@/components/brand";
import { formatDistanceToNow } from "date-fns";
import {
  listCommunityPosts,
  createCommunityPost,
  uploadCommunityImage,
  mediaUrl,
  type CommunityCategory,
  type CommunityPostListItem,
} from "@/lib/community";

const CATEGORIES: { key: CommunityCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "question", label: "Questions" },
  { key: "experience", label: "Experiences" },
  { key: "showcase", label: "Screenshots" },
];

const CAT_COLOR: Record<CommunityCategory, string> = {
  question: "#3b82f6",
  experience: "#22c55e",
  showcase: BRAND,
};

export default function CommunityPage() {
  const [filter, setFilter] = useState<CommunityCategory | "all">("all");
  const [posts, setPosts] = useState<CommunityPostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await listCommunityPosts(
        filter === "all" ? undefined : filter,
      );
      setPosts(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#111",
        background: "#fafafa",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .zdb-comm-pad { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>

      <SiteNav active="community" />

      <main
        className="zdb-comm-pad"
        style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: "0 0 8px",
            letterSpacing: -0.5,
          }}
        >
          Community
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#555",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          Share experiences, post screenshots, ask questions, and help other
          builders. No account required — just your name.
        </p>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            width: "100%",
            padding: "12px 16px",
            marginBottom: 20,
            background: showForm ? "#fff" : "#111",
            color: showForm ? "#111" : "#fff",
            border: showForm ? "1px solid #ddd" : "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "+ New post"}
        </button>

        {showForm && (
          <NewPostForm
            onPosted={(id) => {
              setShowForm(false);
              load();
              window.location.href = `/community/${id}`;
            }}
            onError={setErr}
          />
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                border: filter === c.key ? "1px solid #111" : "1px solid #ddd",
                background: filter === c.key ? "#111" : "#fff",
                color: filter === c.key ? "#fff" : "#555",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {err && (
          <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>
            {err}
          </p>
        )}

        {loading ? (
          <p style={{ color: "#888", fontSize: 14 }}>Loading…</p>
        ) : posts.length === 0 ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e5e5",
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
            }}
          >
            <p style={{ color: "#888", margin: 0 }}>
              No posts yet. Be the first to share something.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/community/${p.id}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                  padding: "18px 20px",
                  transition: "border-color 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color:
                        CAT_COLOR[p.category as CommunityCategory] ?? "#888",
                    }}
                  >
                    {p.category}
                  </span>
                  <span style={{ fontSize: 12, color: "#aaa" }}>
                    {p.author_name} ·{" "}
                    {formatDistanceToNow(new Date(p.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {p.reply_count > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#888",
                        marginLeft: "auto",
                      }}
                    >
                      {p.reply_count}{" "}
                      {p.reply_count === 1 ? "reply" : "replies"}
                    </span>
                  )}
                </div>
                <h2
                  style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}
                >
                  {p.title}
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "#555",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {p.excerpt}
                  {p.excerpt.length >= 280 ? "…" : ""}
                </p>
                {p.image_urls.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    {p.image_urls.slice(0, 3).map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={mediaUrl(url)}
                        alt=""
                        style={{
                          width: 72,
                          height: 72,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #eee",
                        }}
                      />
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}

function NewPostForm({
  onPosted,
  onError,
}: {
  onPosted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [website, setWebsite] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    onError("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 4)) {
        urls.push(await uploadCommunityImage(file));
      }
      setImages((prev) => [...prev, ...urls].slice(0, 6));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (website) return;
    setSubmitting(true);
    onError("");
    try {
      const res = await createCommunityPost({
        author_name: authorName,
        author_email: authorEmail || undefined,
        category,
        title,
        body,
        image_urls: images,
      });
      onPosted(res.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
  };

  return (
    <form
      onSubmit={submit}
      style={{
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ display: "none" }}
        tabIndex={-1}
        autoComplete="off"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            Your name *
          </label>
          <input
            required
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            style={inputStyle}
            placeholder="Alex"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            Email (optional)
          </label>
          <input
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            style={inputStyle}
            placeholder="you@company.com"
          />
        </div>
      </div>

      <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
        Type
      </label>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["question", "experience", "showcase"] as CommunityCategory[]).map(
          (c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                cursor: "pointer",
                border: category === c ? "1px solid #111" : "1px solid #ddd",
                background: category === c ? "#f5f5f5" : "#fff",
              }}
            >
              {c}
            </button>
          ),
        )}
      </div>

      <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
        Title *
      </label>
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
        placeholder="What's on your mind?"
      />

      <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
        Details *
      </label>
      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
        placeholder="Share your experience, question, or context…"
      />

      <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
        Screenshots (optional)
      </label>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={onFile}
        style={{ fontSize: 13, marginBottom: 12 }}
      />
      {uploading && <p style={{ fontSize: 12, color: "#888" }}>Uploading…</p>}
      {images.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          {images.map((url) => (
            <div key={url} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(url)}
                alt=""
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
              <button
                type="button"
                onClick={() =>
                  setImages((prev) => prev.filter((u) => u !== url))
                }
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={
          submitting ||
          !authorName.trim() ||
          title.length < 3 ||
          body.length < 10
        }
        style={{
          padding: "11px 20px",
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Posting…" : "Publish"}
      </button>
    </form>
  );
}
