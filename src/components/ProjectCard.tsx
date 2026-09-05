import { ExternalLink } from 'lucide-react';
import type { Project } from '../types/portfolio';

interface Props {
  project: Project;
  index: number;
}

/**
 * Doc §02 §6 — sticky dark card, numbered.
 * LIVE PROJECT button is hidden when link is empty; image falls back to a
 * dark placeholder with the title overlaid. The image cell keeps a reserved
 * aspect box so a lazily-loaded screenshot cannot shift the layout.
 */
export default function ProjectCard({ project, index }: Props) {
  const hasLink = Boolean(project.link && project.link.trim() !== '');
  const hasImage = Boolean(project.image && project.image.trim() !== '');

  return (
    <article
      className="sticky overflow-hidden rounded-2xl border border-line bg-card"
      style={{ top: `${96 + index * 12}px` }}
    >
      <div className="grid md:grid-cols-2">
        <div className="p-8 sm:p-10">
          <div className="mb-4 flex items-center gap-3">
            <span className="font-mono text-sm text-neutral-400">
              {String(index + 1).padStart(2, '0')}
            </span>
            {project.highlight && (
              <span className="accent-gradient rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-white">
                FEATURED
              </span>
            )}
            <span className="font-mono text-xs text-neutral-400">{project.year}</span>
          </div>

          <h3 className="text-2xl font-medium text-white sm:text-3xl">{project.title}</h3>
          <p className="mt-1 text-sm text-neutral-400">{project.subtitle}</p>
          <p className="no-break mt-4 text-neutral-400">{project.description}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {project.stack.map((s) => (
              <span
                key={s}
                className="rounded-full border border-line px-3 py-1 font-mono text-xs text-neutral-400"
              >
                {s}
              </span>
            ))}
          </div>

          <p className="mt-5 text-xs text-neutral-400">{project.role}</p>

          {hasLink && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-white transition-colors hover:border-neutral-500"
            >
              LIVE PROJECT <ExternalLink size={14} />
            </a>
          )}
        </div>

        <div className="relative aspect-[16/10] min-h-[220px] border-t border-line md:aspect-auto md:border-l md:border-t-0">
          {hasImage ? (
            <img
              src={project.image}
              alt={`${project.title} — ${project.subtitle}`}
              loading="lazy"
              decoding="async"
              width={1280}
              height={800}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[#101010] p-6">
              <span className="hero-heading text-center text-2xl font-semibold sm:text-3xl">
                {project.title}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
