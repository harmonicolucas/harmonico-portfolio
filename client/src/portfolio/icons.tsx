import {
  Award,
  BookOpen,
  Briefcase,
  Code,
  CodeXml,
  Cpu,
  Database,
  FileText,
  FlaskConical,
  Github,
  Globe,
  GraduationCap,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Mic,
  Network,
  Phone,
  Rocket,
  Server,
  Shield,
  ShieldCheck,
  Star,
  Trophy,
  Twitter,
  Users,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  code: CodeXml,
  "code-2": Code,
  flask: FlaskConical,
  rocket: Rocket,
  award: Award,
  trophy: Trophy,
  graduation: GraduationCap,
  shield: Shield,
  "shield-check": ShieldCheck,
  network: Network,
  server: Server,
  database: Database,
  cpu: Cpu,
  briefcase: Briefcase,
  book: BookOpen,
  mic: Mic,
  users: Users,
  star: Star,
  file: FileText,
  globe: Globe,
  mail: Mail,
  phone: Phone,
  "map-pin": MapPin,
  github: Github,
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
};

export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, size = 18, strokeWidth = 2 }: { name: string; size?: number; strokeWidth?: number }) {
  const Cmp = ICONS[name] ?? Award;
  return <Cmp size={size} strokeWidth={strokeWidth} />;
}

/** Animated illustrations used by the capability cards (same assets style as the reference). */
export const BENTO_VISUALS: Record<string, string> = {
  network: "/images/assistant.gif",
  support: "/images/assistant.gif",
  code: "/images/coding.gif",
  social: "/images/social.gif",
};
