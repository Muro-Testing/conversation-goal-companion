type IconProps = { className?: string };

export function SparkIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2.8 19.2 12l9.2 4-9.2 3.2-3.2 9.2L12 19.2l-9.2-3.2L12 12l4-9.2Z" fill="currentColor"/><circle cx="25.2" cy="6.8" r="2.2" fill="currentColor" opacity=".48"/></svg>;
}

export function LockIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor"/></svg>;
}

export function ChatIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.4-.75L4 20l1.65-4.3A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round"/><path d="M8.5 11.5h7M8.5 14.5h4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"/></svg>;
}

export function MapIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3.5 6 5-2.5 7 2.5 5-2.5v14l-5 2.5-7-2.5-5 2.5V6Z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round"/><path d="M8.5 3.5v14m7-11.5v14" stroke="currentColor" strokeWidth="1.65"/></svg>;
}

export function PlusIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

export function MenuIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

export function MicIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-3.5 0h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

export function ArrowIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5m0 0L6.5 10.5M12 5l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function CompassIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6"/><path d="m15.4 8.6-2.1 4.7-4.7 2.1 2.1-4.7 4.7-2.1Z" fill="currentColor"/></svg>;
}
