import React from 'react';
import {Link} from 'react-router-dom';
import {Search, Home, ShieldCheck} from 'lucide-react';
const steps=[
  {icon:Search,title:'See more of the picture',desc:'Explore available homes with property photos, location details and reviews.'},
  {icon:Home,title:'Keep your rental life connected',desc:'Bring agreements, rent records and repair conversations together in your portal.'},
  {icon:ShieldCheck,title:'Make clearer decisions',desc:'Review documented inspections and tenancy records before the next chapter begins.'}
];
export default function HomeExperience() {
  return <>
    <section className="experience"><p className="eyebrow">02 / THE EXPERIENCE</p><h2><Link to="/the-propwiz-experience">The PropWiz Experience</Link></h2>
      {steps.map(({icon:Icon,title,desc})=><div key={title} className="row"><span className="row-icon"><Icon/></span><div><h3>{title}</h3><p>{desc}</p></div></div>)}
    </section>
    <section className="owner-wrap"><div className="owner"><div><h2>Own rental property?</h2><p>List your units, manage tenants, track rent, and handle maintenance — all in one platform.</p></div><Link to="/register">List your property</Link></div></section>
  </>;
}