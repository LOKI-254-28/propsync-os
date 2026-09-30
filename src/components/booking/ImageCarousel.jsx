import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

// items: [{ url, caption }] — public images only. Chevrons on desktop, swipe on mobile.
export default function ImageCarousel({ items = [], className = "h-64" }) {
  const [i, setI] = useState(0);
  const [startX, setStartX] = useState(null);
  const n = items.length;
  const go = (d) => setI((v) => (v + d + n) % n);

  if (n === 0) {
    return <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 ${className}`}><ImageOff className="h-10 w-10 text-emerald-300" /></div>;
  }
  const cur = items[Math.min(i, n - 1)];
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-100 ${className}`}
      onTouchStart={(e) => setStartX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (startX === null || n < 2) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        setStartX(null);
      }}
    >
      <img src={cur.url} alt={cur.caption || "Photo"} className="h-full w-full object-cover" />
      {cur.caption && <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">{cur.caption}</span>}
      {n > 1 && (
        <>
          <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="Next photo" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"><ChevronRight className="h-5 w-5" /></button>
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{Math.min(i, n - 1) + 1}/{n}</span>
        </>
      )}
    </div>
  );
}