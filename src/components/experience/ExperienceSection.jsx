import React from 'react';
import {motion,useReducedMotion} from 'framer-motion';
export default function ExperienceSection({id,eyebrow,title,description,children}) {
  const reduced=useReducedMotion();
  return <motion.section id={id} initial={reduced?false:{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:0.15}} transition={{duration:0.45}} className="page-container py-16 sm:py-24"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-contact-forest/70">{eyebrow}</p><h2 className="mt-3 max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight text-contact-forest sm:text-4xl">{title}</h2>{description&&<p className="mt-4 max-w-2xl text-base leading-relaxed text-contact-forest/70">{description}</p>}<div className="mt-8">{children}</div></motion.section>;
}