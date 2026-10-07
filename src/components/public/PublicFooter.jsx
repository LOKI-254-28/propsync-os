import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import FooterContact from '@/components/public/FooterContact';

const links = [
  ['Home', '/'],
  ['Browse rentals', '/listings'],
  ['The PropWiz Experience', '/the-propwiz-experience'],
  ['Contact', '/contact'],
];

export default function PublicFooter() {
  const year = new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', year: 'numeric' });
  return <footer className="public-footer font-body">
    <div className="public-footer-inner">
      <div className="public-footer-grid">
        <div className="public-footer-brand">
          <Link to="/" className="public-footer-lockup"><span className="public-footer-mark"><Home size={20} strokeWidth={1.8} aria-hidden="true"/></span><span>PropWiz</span></Link>
          <p className="public-footer-tagline">Rentals made simple.</p>
          <p>Find your next home and keep your rental life connected, all in one place.</p>
        </div>
        <section aria-labelledby="footer-explore-heading"><h2 id="footer-explore-heading">Explore PropWiz</h2>
          <div className="public-footer-links">{links.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}</div>
        </section>
        <FooterContact />
      </div>
      <div className="public-footer-bottom">© {year} PropWiz. Rentals made simple.</div>
    </div>
  </footer>;
}