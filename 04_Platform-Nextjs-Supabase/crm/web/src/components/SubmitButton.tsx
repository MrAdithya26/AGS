'use client';
import { useFormStatus } from 'react-dom';
/** Submit button that locks itself while the form is being saved (stops double bookings / double payments). */
export default function SubmitButton({ children, busy = 'Saving…', className = 'btn primary' }: { children: React.ReactNode; busy?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} aria-busy={pending}>{pending ? busy : children}</button>;
}
