import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function FooterContact() {
  const { data: contact = {}, isPending } = useQuery({
    queryKey: ['public-contact-config'],
    queryFn: async () => (await base44.entities.ContactPageConfig.list())[0] || {},
  });
  const digits = (contact.whatsapp || '').replace(/\D/g, '');
  return <section className="public-footer-contact" aria-labelledby="footer-contact-heading">
    <h2 id="footer-contact-heading">Get in touch</h2>
    <Link to="/contact">Contact us →</Link>
    {isPending && <p role="status">Loading contact details…</p>}
    {contact.email && <a href={`mailto:${contact.email}`}><Mail size={16} aria-hidden="true"/><span>{contact.email}</span></a>}
    {digits && <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden="true"/><span>{contact.whatsapp}</span></a>}
    {contact.address && <p className="public-footer-address"><MapPin size={16} aria-hidden="true"/><span>{contact.address}</span></p>}
  </section>;
}