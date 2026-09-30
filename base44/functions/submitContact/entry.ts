import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Public contact form: stores the message and notifies admins.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const b = await req.json();
    const name = String(b.name || '').trim().slice(0, 100);
    const message = String(b.message || '').trim().slice(0, 2000);
    const email = String(b.email || '').trim().slice(0, 150);
    const phone = String(b.phone || '').trim().slice(0, 30);
    if (!name || !message || (!email && !phone)) {
      return Response.json({ error: 'Enter your name, a message, and an email or phone number.' }, { status: 400 });
    }
    const sr = base44.asServiceRole;
    await sr.entities.ContactMessage.create({ name, email, phone, message });
    const admins = await sr.entities.User.filter({ role: 'admin' });
    for (const a of admins.slice(0, 10)) {
      await sr.entities.Notification.create({
        recipient_user_id: a.id, type: 'Contact', title: `Contact message from ${name}`,
        message: message.slice(0, 200), date: new Date().toISOString(), read: false,
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}