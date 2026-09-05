import { Github, Linkedin, Instagram, Mail, Phone, Globe } from 'lucide-react';
import type { Social } from '../types/portfolio';

interface Props {
  social: Social;
  /** pill = hero row, plain = footer list */
  variant?: 'pill' | 'plain';
}

type Entry = { key: keyof Social; label: string; href: string; Icon: typeof Github };

/** Doc §02 §1 — hide empty social links, never render a broken href. */
export default function SocialLinks({ social, variant = 'pill' }: Props) {
  const all: Entry[] = [
    { key: 'github', label: 'GitHub', href: social.github, Icon: Github },
    { key: 'linkedin', label: 'LinkedIn', href: social.linkedin, Icon: Linkedin },
    { key: 'instagram', label: 'Instagram', href: social.instagram, Icon: Instagram },
    { key: 'website', label: 'Website', href: social.website, Icon: Globe },
    { key: 'email', label: 'Email', href: social.email ? `mailto:${social.email}` : '', Icon: Mail },
    { key: 'phone', label: 'Phone', href: social.phone ? `tel:${social.phone.replace(/\s/g, '')}` : '', Icon: Phone },
  ];

  const links = all.filter((l) => l.href && l.href.trim() !== '');
  if (links.length === 0) return null;

  if (variant === 'plain') {
    return (
      <div className="flex flex-wrap gap-3">
        {links.map(({ key, label, href, Icon }) => (
          <a
            key={key}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            aria-label={label}
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white"
          >
            <Icon size={16} />
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {links.map(({ key, label, href, Icon }) => (
        <a
          key={key}
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-4 py-2 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
        >
          <Icon size={15} />
          <span>{label}</span>
        </a>
      ))}
    </div>
  );
}
