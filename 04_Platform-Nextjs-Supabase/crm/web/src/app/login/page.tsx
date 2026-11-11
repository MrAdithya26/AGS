'use client';
import { useActionState } from 'react';
import { signIn } from './actions';

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <div className="loginWrap"><div className="loginCard">
      <div className="logo" style={{ margin: '0 auto 12px', width: 46, height: 46 }}>AGS</div>
      <h1 style={{ margin: '4px 0 2px', fontSize: 20 }}>AGS Services Master</h1>
      <div className="muted small">Staff login · Adithya Group of Services</div>
      <form action={action}>
        <label className="f">Email<input className="i" name="email" type="email" autoComplete="username" required /></label>
        <label className="f">Password<input className="i" name="password" type="password" autoComplete="current-password" required /></label>
        {error && <div className="err">{error}</div>}
        <button className="btn primary" disabled={pending} style={{ justifyContent: 'center' }}>{pending ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="note">Staff accounts are created by the owner. AGS is an independent private service, not a government service.</div>
    </div></div>
  );
}
