export const SITE = {
  name: "Migration",
  tagline: "Swap your piggy to the new art.",
} as const;

export type Social = {
  label: string;
  href: string;
  /** Key into ICONS in components/site-footer.tsx */
  icon: "x" | "discord" | "github";
};

// Mirrors ../website/lib/site.ts, the source of truth for the org's social
// links.
export const SOCIALS: Social[] = [
  { label: "X", href: "https://x.com/PiggySolGang", icon: "x" },
  { label: "Discord", href: "https://discord.gg/8SjGR8Srvz", icon: "discord" },
  { label: "GitHub", href: "https://github.com/piggygang", icon: "github" },
];
