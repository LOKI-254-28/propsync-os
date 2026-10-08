import React from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '@/lib/AuthContext';
export default function ExperienceCTA() {
  const {user,isAuthenticated}=useAuth();
  const target=isAuthenticated&&(user?.account_type==='landowner'||user?.role==='admin')?'/properties':'/register';
  return <section className="bg-contact-forest page-gutters py-16 text-center text-contact-cream sm:py-24"><div className="mx-auto max-w-3xl"><p className="text-xs uppercase tracking-[0.2em] text-contact-gold">Your next chapter starts here</p><h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight sm:text-5xl">Make your next rental decision a clearer one.</h2><p className="mt-5 text-contact-cream/70">Bring your property into view, or explore a place to call home. PropWiz keeps the people, records and conversations connected.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to={target} className="rounded-lg bg-contact-gold px-6 py-3 text-sm font-semibold text-contact-forest">List your property</Link><Link to="/listings" className="rounded-lg border border-contact-soft/40 px-6 py-3 text-sm font-medium">Find your next home</Link></div></div></section>;
}