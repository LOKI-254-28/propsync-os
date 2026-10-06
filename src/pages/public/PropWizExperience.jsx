import React,{useEffect} from 'react';
import PublicLayout from '@/components/public/PublicLayout';
import ExperienceHero from '@/components/experience/ExperienceHero';
import ExperienceSection from '@/components/experience/ExperienceSection';
import ExperienceBenefits from '@/components/experience/ExperienceBenefits';
import ExperienceTrust from '@/components/experience/ExperienceTrust';
import ExperienceCTA from '@/components/experience/ExperienceCTA';
export default function PropWizExperience() {
  useEffect(()=>{const previous=document.title;document.title='The PropWiz Experience | PropWiz';return()=>{document.title=previous;};},[]);
  return <PublicLayout><div className="overflow-hidden bg-gradient-to-b from-contact-cream via-contact-soft/15 to-contact-cream"><ExperienceHero/><ExperienceSection id="landlords" eyebrow="For landlords" title="Your property deserves more than a listing." description="Turn visibility into informed conversations, and everyday property operations into a clearer, connected experience."><ExperienceBenefits audience="landlord"/></ExperienceSection><div className="border-y border-contact-soft/30 bg-card/35"><ExperienceSection id="tenants" eyebrow="For tenants" title="Find a place. Understand it. Make it yours." description="Move beyond a headline and a price. Explore the details, review the records and keep your tenancy connected from the start."><ExperienceBenefits audience="tenant"/></ExperienceSection></div><ExperienceSection id="trust" eyebrow="Trust & transparency" title="Confidence comes from a clearer picture." description="Not promises without proof. Connected records, documented conditions and conversations that keep their context."><ExperienceTrust/></ExperienceSection><ExperienceCTA/></div></PublicLayout>;
}