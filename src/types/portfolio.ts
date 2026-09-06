export interface Social {
  github: string;
  instagram: string;
  linkedin: string;
  email: string;
  phone: string;
  website: string;
}

export interface Profile {
  name: string;
  shortName: string;
  tagline: string;
  role: string;
  specialization: string;
  location: string;
  yearsOfExperience: string;
  bio: string;
  avatarSvg: string;
  social: Social;
}

/** One buried statistic, revealed by mining its block. */
export interface Ore {
  label: string;
  value: string;
  color: string;
  material: string;
  /** path to the ore block sprite in /public/tex */
  icon: string;
}

/** Stats panel, hotbar and splash text all read from here. */
export interface Game {
  className: string;
  level: number;
  levelLabel: string;
  hearts: number;
  hunger: number;
  spawn: string;
  status: string;
  splashes: string[];
  ores: Ore[];
}

/** A skill rendered as an enchantment: level is 1-5, shown in roman numerals. */
export interface Skill {
  name: string;
  level: number;
}

export interface SkillCategory {
  name: string;
  items: Skill[];
}

export interface Skills {
  categories: SkillCategory[];
}

export interface Service {
  title: string;
  body: string;
  tags: string[];
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  location: string;
  summary: string;
  highlights: string[];
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  stack: string[];
  role: string;
  year: string;
  link: string;
  image: string;
  highlight: boolean;
  /** block colour for the chest slot */
  color: string;
  rarity: Rarity;
  /** material name shown in the item tooltip */
  material: string;
  /** path to the item sprite in /public/tex */
  icon: string;
}

export interface Education {
  institution: string;
  degree: string;
  period: string;
  location: string;
  result: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatarColor: string;
}

export interface Portfolio {
  profile: Profile;
  game: Game;
  skills: Skills;
  services: Service[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  testimonials: Testimonial[];
}
