import { useMemo } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import ProjectCard from './ProjectCard';

/** Doc §02 §6 — sticky dark cards, highlight:true sorted first. */
export default function ProjectsSection() {
  const { projects } = usePortfolio();

  const ordered = useMemo(
    () => [...projects].sort((a, b) => Number(b.highlight) - Number(a.highlight)),
    [projects],
  );

  if (ordered.length === 0) return null;

  return (
    <section id="projects" className="mx-auto max-w-6xl px-6 py-24">
      <p className="mb-3 text-xs tracking-[0.22em] text-neutral-400">PROJECTS</p>
      <h2 className="hero-heading mb-12 text-4xl font-semibold sm:text-5xl">Things I&apos;ve shipped</h2>

      <div className="space-y-6">
        {ordered.map((p, i) => (
          <ProjectCard key={p.id} project={p} index={i} />
        ))}
      </div>
    </section>
  );
}
