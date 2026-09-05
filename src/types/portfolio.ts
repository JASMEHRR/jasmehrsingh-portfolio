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

export interface SkillCategory {
  name: string;
  items: string[];
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
  skills: Skills;
  experience: Experience[];
  services: Service[];
  projects: Project[];
  education: Education[];
  testimonials: Testimonial[];
}
