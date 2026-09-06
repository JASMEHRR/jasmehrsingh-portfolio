import { useState } from 'react';
import { Github, Linkedin, Mail, Phone, Globe, Check, Copy } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { Panel } from './mc/Gui';
import type { Social } from '../types/portfolio';

type Entry = { key: keyof Social; label: string; value: string; href: string; Icon: typeof Github };

/**
 * Contact as an oak sign at the world's edge, under a night sky.
 * Empty entries in profile.social are dropped rather than rendered broken.
 */
export default function ContactSign() {
  const { profile } = usePortfolio();
  const [copied, setCopied] = useState(false);
  const s = profile.social;

  const entries: Entry[] = ([
    { key: 'github', label: 'GitHub', value: 'JASMEHRR', href: s.github, Icon: Github },
    { key: 'linkedin', label: 'LinkedIn', value: 'jasmehr-singh', href: s.linkedin, Icon: Linkedin },
    { key: 'email', label: 'Email', value: s.email, href: s.email ? `mailto:${s.email}` : '', Icon: Mail },
    { key: 'phone', label: 'Phone', value: s.phone, href: s.phone ? `tel:${s.phone.replace(/\s/g, '')}` : '', Icon: Phone },
    { key: 'website', label: 'Website', value: 'jasmehrsingh.netlify.app', href: s.website, Icon: Globe },
  ] satisfies Entry[]).filter((e) => e.href && e.href.trim() !== '');

  const copyEmail = async () => {
    if (!s.email) return;
    try {
      await navigator.clipboard.writeText(s.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked; the mailto link still works, so fail quietly
      setCopied(false);
    }
  };

  return (
    <section
      id="contact"
      data-biome="night"
      className="relative z-10 mx-auto max-w-4xl px-4 py-24"
    >
      <header className="mb-8 text-center" data-reveal="0">
        <p
          className="mc-out mb-3 text-[color:var(--xp)]"
          style={{ fontFamily: 'var(--px)', fontSize: 10 }}
        >
          RESPAWN POINT
        </p>
        <h2
          className="mc-out-lg text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 'clamp(16px,3vw,26px)', lineHeight: 1.4 }}
        >
          Let&apos;s Build Something
        </h2>
      </header>

      {/* the sign board */}
      <div
        className="mx-auto max-w-xl border-[3px] border-black p-6 text-center"
        style={{
          background: 'linear-gradient(180deg,#a9793f,#8a6032)',
          boxShadow: 'inset 4px 4px 0 rgba(255,255,255,.22), inset -4px -4px 0 rgba(0,0,0,.3), 10px 10px 0 rgba(0,0,0,.35)',
        }}
      >
        <p
          className="mc-out text-white"
          style={{ fontFamily: 'var(--px)', fontSize: 10, lineHeight: 2.2 }}
        >
          Open to work
          <br />
          &amp; collaborations
        </p>
      </div>

      <div className="mt-8">
        <Panel title="Contact">
          <ul className="grid gap-3 sm:grid-cols-2">
            {entries.map(({ key, label, value, href, Icon }) => (
              <li key={key}>
                <a
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-3 border-2 border-black px-3 py-3 transition-transform hover:translate-y-[-2px]"
                  style={{
                    background: '#1a1420',
                    boxShadow: 'inset 2px 2px 0 rgba(255,255,255,.08), inset -2px -2px 0 rgba(0,0,0,.5)',
                  }}
                >
                  <Icon size={18} className="shrink-0 text-[color:var(--gold)]" aria-hidden />
                  <span className="min-w-0">
                    <span
                      className="block text-[#b9a6d8]"
                      style={{ fontFamily: 'var(--px)', fontSize: 7 }}
                    >
                      {label}
                    </span>
                    <span className="block truncate text-[19px] leading-tight text-white">
                      {value}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          {s.email && (
            <button
              type="button"
              onClick={copyEmail}
              className="mc-btn mt-5 flex w-full items-center justify-center gap-2 px-4 py-3 text-[9px]"
            >
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copied ? 'Copied to clipboard' : 'Copy email address'}
            </button>
          )}
        </Panel>
      </div>

      <footer className="mt-10 text-center">
        <p
          className="mc-out text-white/60"
          style={{ fontFamily: 'var(--px)', fontSize: 7, lineHeight: 2.4 }}
        >
          © {new Date().getFullYear()} {profile.name} · Built with Claude Code
        </p>
      </footer>
    </section>
  );
}
