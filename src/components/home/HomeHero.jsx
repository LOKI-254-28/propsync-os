import React from 'react';
import { Image } from '@/components/ui/image';
const UNIT_TYPES = ['Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', 'Penthouse', 'Commercial'];
export default function HomeHero({search,setSearch,type,setType,maxPrice,setMaxPrice,submitSearch}) {
  return <section className="hero"><div className="hero-frame">
    <Image className="hero-image" src="https://media.base44.com/images/public/6ab4545ce0e486f7d7f743ec/7a19d69fb_generated_19e2492d.jpg" alt="Nairobi apartment balcony" />
    <div className="hero-copy"><p className="eyebrow">01 / FIND A PLACE</p>
      <h1>Find your next rental, made simple.</h1>
      <p className="hero-desc">Browse verified rental listings, apply online, and manage your tenancy — all in one place.</p>
      <form className="searchbox" onSubmit={submitSearch}>
        <input aria-label="Location, property, or keyword" placeholder="Location, property, or keyword" value={search} onChange={e=>setSearch(e.target.value)} />
        <select aria-label="All types" value={type} onChange={e=>setType(e.target.value)}><option value="">All types</option>{UNIT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
        <input aria-label="Max price" type="number" placeholder="Max price" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} />
        <button type="submit">Search</button>
      </form>
    </div>
  </div></section>;
}