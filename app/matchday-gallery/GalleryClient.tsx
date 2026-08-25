"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { MATCHDAY_GALLERY } from "@/app/lib/matchday-gallery";
import type { GalleryComment, GalleryState } from "@/app/lib/gallery";
import { Drawer, DrawerContent } from "@/app/components/ui/drawer";
import ModalPortal from "@/app/components/ModalPortal";

export default function GalleryClient() {
  const router = useRouter(); const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0); const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [states, setStates] = useState<Record<string, GalleryState>>({}); const [commentsOpen, setCommentsOpen] = useState(false);
  const art = MATCHDAY_GALLERY[index]; const social = states[art.id] ?? { artworkId: art.id, liked: false, likeCount: 0, commentCount: 0 };
  useEffect(() => { fetch("/api/gallery/state").then(r => r.ok ? r.json() : []).then((rows: GalleryState[]) => setStates(Object.fromEntries(rows.map(x => [x.artworkId, x])))); }, []);
  useEffect(() => { for (let d = -2; d <= 2; d++) { const x = MATCHDAY_GALLERY[index + d]; if (x) { const image = new Image(); image.src = x.src; } } }, [index]);
  function move(next: number) { const i = Math.max(0, Math.min(MATCHDAY_GALLERY.length - 1, next)); rail.current?.scrollTo({ left: i * rail.current.clientWidth, behavior: "smooth" }); }
  async function like() { const before = social; setStates(s => ({ ...s, [art.id]: { ...before, liked: !before.liked, likeCount: Math.max(0, before.likeCount + (before.liked ? -1 : 1)) } })); const r = await fetch(`/api/gallery/${art.id}/like`, { method: "POST" }); if (r.ok) { const x = await r.json(); setStates(s => ({ ...s, [art.id]: { ...s[art.id], ...x } })); } else setStates(s => ({ ...s, [art.id]: before })); }
  return <ModalPortal><main className="fixed inset-0 z-30 mx-auto h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#07080b] text-white flex">
    <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
      <button onClick={() => router.back()} aria-label="뒤로" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur"><ArrowLeft /></button>
      <div className="text-center"><p className="text-[9px] font-black tracking-[.28em] text-[#FF9BAE]">MATCHDAY ARCHIVE</p><p className="mt-1 text-xs font-bold tracking-wider">{art.title}</p></div>
      <span className="w-10 text-right text-[11px] font-bold text-white/65">{index + 1}/{MATCHDAY_GALLERY.length}</span>
    </header>
    <div ref={rail} onScroll={e => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
      {MATCHDAY_GALLERY.map((x, i) => <section key={x.id} onClick={e => { const box = e.currentTarget.getBoundingClientRect(); move(i + (e.clientX - box.left < box.width / 2 ? -1 : 1)); }} className="relative flex min-w-full snap-center items-center bg-cover bg-center" style={{ backgroundImage: `url(${x.thumb})` }}>
        <div className="absolute inset-0 bg-black/15" />
        {/* Static files bypass the image optimizer: browser cache + adjacent preloading keeps server work flat. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={x.src} alt={x.title} loading={i < 2 ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(v => ({ ...v, [x.id]: true }))} className={`relative w-full select-none object-contain transition-opacity duration-500 ${loaded[x.id] ? "opacity-100" : "opacity-0"}`} />
      </section>)}
    </div>
    <aside className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] right-4 z-20 flex flex-col gap-4">
      <Action label={String(social.likeCount)} onClick={like}><Heart className={social.liked ? "fill-[#FF8FA3] text-[#FF8FA3]" : ""} /></Action>
      <Action label={String(social.commentCount)} onClick={() => setCommentsOpen(true)}><MessageCircle /></Action>
      <a href={art.src} download className="flex flex-col items-center gap-1" onClick={e => e.stopPropagation()}><span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur"><Download className="h-5 w-5" /></span><span className="text-[9px] font-bold">SAVE</span></a>
    </aside>
    <div className="absolute bottom-[max(20px,env(safe-area-inset-bottom))] left-4 z-10 flex max-w-[250px] gap-1.5 overflow-hidden">{MATCHDAY_GALLERY.map((_, i) => <button key={i} onClick={() => move(i)} className={`h-1 rounded-full transition-all ${i === index ? "w-7 bg-[#FF8FA3]" : "w-2 bg-white/35"}`} />)}</div>
    <CommentsDrawer artworkId={art.id} open={commentsOpen} onOpenChange={setCommentsOpen} onCount={count => setStates(s => ({ ...s, [art.id]: { ...(s[art.id] ?? social), commentCount: count } }))} />
  </main></ModalPortal>;
}

function Action({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={e => { e.stopPropagation(); onClick(); }} className="flex flex-col items-center gap-1"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur [&>svg]:h-5 [&>svg]:w-5">{children}</span><span className="text-[10px] font-black">{label}</span></button>; }

function CommentsDrawer({ artworkId, open, onOpenChange, onCount }: { artworkId: string; open: boolean; onOpenChange: (v: boolean) => void; onCount: (n: number) => void }) {
  const [items, setItems] = useState<GalleryComment[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { if (!open) return; fetch(`/api/gallery/${artworkId}/comments`).then(r => r.json()).then(x => { setItems(x); onCount(x.length); }); }, [open, artworkId]);
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!message.trim()) return; const r = await fetch(`/api/gallery/${artworkId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }); if (r.ok) { const x = await r.json(); setItems(v => [...v, x]); onCount(items.length + 1); setMessage(""); } }
  return <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent className="mx-auto max-h-[72dvh] max-w-md rounded-t-[28px] border-white/10 bg-[#141418] text-white">
    <div className="px-5 pb-2 pt-2"><h2 className="text-sm font-black">COMMENTS <span className="ml-1 text-[#FF8FA3]">{items.length}</span></h2></div>
    <div className="min-h-32 flex-1 overflow-y-auto px-5 py-3">{items.length ? items.map(x => <div key={x.id} className="mb-4"><div className="flex items-center justify-between"><b className="text-xs">{x.author}</b><Trash2 className="hidden h-3 w-3 text-white/30" /></div><p className="mt-1 text-sm text-white/80">{x.message}</p></div>) : <p className="py-10 text-center text-sm text-white/40">첫 댓글을 남겨보세요.</p>}</div>
    <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-4 pb-[max(16px,env(safe-area-inset-bottom))]"><input value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} placeholder="댓글 남기기" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 text-sm outline-none placeholder:text-white/35" /><button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF8FA3] text-white"><Send className="h-4 w-4" /></button></form>
  </DrawerContent></Drawer>;
}
