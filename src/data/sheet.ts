/**
 * All character-sheet content lives here. Edit this file, not the components.
 *
 * Self-assessed placeholders for Graham to set: ability `score`s, proficiency levels,
 * and `slots`. Everything else is taken from the current resume and the old site.
 */

export interface Ability {
  key: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
  name: string;
  domain: string;
  score: number;
  proof: string[];
}
export interface Role {
  title: string;
  period: string;
  bullets: string[];
}
export interface Quest {
  company: string;
  where: string;
  status: "active" | "completed" | "training";
  roles: Role[];
}
export interface Deed {
  name: string;
  summary: string;
  problem?: string;
  solution?: string;
  impact?: string;
  stack: string[];
  role: string;
  link?: { label: string; href: string };
}
export type Rarity = "Legendary" | "Very rare" | "Rare" | "Uncommon";

export const PROFILE = {
  name: "Graham Rowe",
  tagline: "Senior full-stack engineer. I build fast, reliable web apps for teams and small businesses.",
  className: "Full-Stack Engineer",
  multiclass: "Senior Engineer / Freelancer",
  background: "Indianapolis, IN",
  alignment: "Lawful Good",
  alignmentNote: "writes tests",
  careerStart: "2020-03-01",
  email: "grahamrowedev@gmail.com",
  linkedin: "https://www.linkedin.com/in/gmrowewebdev/",
  github: "https://github.com/grrowe",
};

/** Freelance capacity this month. Rule of thumb: 2–3 small projects or 1 large. */
export const SLOTS = { open: 2, total: 3 };

export const ABILITIES: Ability[] = [
  {
    key: "STR", name: "Strength", domain: "Backend", score: 16,
    proof: [
      "Builds backend services for secure data exchange with HR, payroll and benefits platforms (Remodel Health).",
      "Designs RESTful APIs and data models for internal workflows and outside integrations.",
      "Built internal tools on Node, Express and SQL at Irving Materials.",
    ],
  },
  {
    key: "DEX", name: "Dexterity", domain: "Frontend", score: 17,
    proof: [
      "Vue.js rebuild at IVM cut load time 40% and raised engagement 35%.",
      "Helped migrate Aptible's customer dashboard to Vite + React.",
      "Has shipped React, Vue and Ember to production.",
    ],
  },
  {
    key: "CON", name: "Constitution", domain: "Reliability", score: 18,
    proof: [
      "Resolved 120+ customer incidents a week at Aptible.",
      "Helped sustain a 98% user satisfaction rate.",
      "Helped scale IVM's frontend from 5,000 to 10,000 daily active users.",
    ],
  },
  {
    key: "INT", name: "Intelligence", domain: "Architecture", score: 15,
    proof: [
      "Ships full-stack features from schema design to frontend delivery.",
      "Built a reusable component architecture with Vue best practices.",
      "Integrated REST and GraphQL third-party APIs.",
    ],
  },
  {
    key: "WIS", name: "Wisdom", domain: "Debugging", score: 17,
    proof: [
      "Incident management and log analysis in production.",
      "Tests, debugs and maintains integrations across multiple environments.",
      "Ramped quickly on a legacy Ember codebase whose original context was lost.",
    ],
  },
  {
    key: "CHA", name: "Charisma", domain: "Communication", score: 14,
    proof: [
      "Turned customer pain points into product and engineering feedback.",
      "Partners with product, design and engineering to ship integrations.",
      "Works directly with support and backend teams to ship features quickly.",
    ],
  },
];

export const TRAITS: [string, string][] = [
  ["Legacy Whisperer", "Picks up old, undocumented codebases (like Aptible's Ember dashboard) and keeps them shipping."],
  ["Incident Responder", "120+ customer incidents resolved a week at Aptible, with a 98% satisfaction rate."],
  ["Integration Specialist", "Connects HR, payroll and benefits platforms at Remodel Health."],
  ["Party Diplomat", "Works across product, design and engineering to ship on schedule."],
  ["Full-Stack Reach", "Ships a feature from database schema to finished UI."],
];

/** 2 = expertise, 1 = proficient */
export const PROFICIENCIES: [string, 1 | 2][] = [
  ["TypeScript", 2], ["JavaScript", 2], ["React", 2], ["Vue.js", 2],
  ["Node.js", 2], ["PostgreSQL", 2], ["REST & GraphQL APIs", 2], ["Incident response", 2],
  ["Express", 1], ["Ruby on Rails", 1], ["MySQL", 1], ["Ember.js", 1],
  ["Docker", 1], ["AWS", 1], ["Azure", 1], ["ASP.NET Core", 1],
];

export const RARITY_COLOR: Record<Rarity, string> = {
  Legendary: "#b85c14",
  "Very rare": "#6f3a99",
  Rare: "#2b5fa8",
  Uncommon: "#3e7d2e",
};

export const INVENTORY: [string, Rarity, string][] = [
  ["TypeScript", "Legendary", "Never leaves home without it."],
  ["React", "Very rare", "Wielded at Aptible and Irving Materials."],
  ["Vue.js", "Very rare", "The blade that carried IVM to 10,000 daily users."],
  ["Ruby on Rails", "Rare", "Standard issue at Aptible."],
  ["PostgreSQL", "Rare", "Holds the party's loot."],
  ["Node.js", "Rare", "Light, fast, always in the pack."],
  ["Docker", "Uncommon", "Portable containment for any spell."],
  ["AWS", "Uncommon", "Cloud mount of choice."],
];

export const SPELLS: [string, string][] = [
  ["Conjure Website", "Custom-coded sites and web apps. No page builders, nothing to lock you in."],
  ["Haste", "Speed audits and rebuilds for slow sites."],
  ["Arcane Link", "API and third-party integrations: payments, CRMs, HR and payroll."],
  ["Restoration", "Modernize a legacy app without stopping the business."],
  ["Ward of Upkeep", "Monthly maintenance: updates, backups, uptime and speed checks."],
];

export const QUESTS: Quest[] = [
  {
    company: "Remodel Health", where: "Indianapolis, IN (Hybrid)", status: "active",
    roles: [
      {
        title: "Senior Software Engineer", period: "Jan 2026 – Present",
        bullets: [
          "Integrating third-party HR platforms for benefits, payroll, and employee data workflows.",
          "Building and maintaining backend services for secure, reliable data exchange.",
          "Implementing full-stack features from schema design to frontend delivery in modern JavaScript/TypeScript stacks.",
          "Partnering with product, design, and engineering teams to ship production-ready integrations.",
        ],
      },
      {
        title: "Full Stack Engineer", period: "Jun 2025 – Jan 2026",
        bullets: [
          "Contributed to core SaaS features and HR platform integrations in production environments.",
          "Implemented RESTful APIs and data models for internal workflows and external platform connectivity.",
          "Tested, debugged, and maintained integrations across multiple environments.",
        ],
      },
    ],
  },
  {
    company: "Aptible", where: "Remote", status: "completed",
    roles: [{
      title: "Customer Reliability Engineer", period: "Aug 2022 – Nov 2024",
      bullets: [
        "Resolved 120+ customer incidents weekly and helped sustain a 98% user satisfaction rate.",
        "Built internal automation tooling with React, Rails, and Postgres to improve team efficiency.",
        "Collaborated across teams to develop, test, and deploy scalable software improvements.",
        "Translated customer pain points into actionable product and engineering feedback.",
      ],
    }],
  },
  {
    company: "IVM, Inc.", where: "Indianapolis, IN", status: "completed",
    roles: [{
      title: "Front End Software Engineer", period: "Mar 2022 – Aug 2022",
      bullets: [
        "Built a Vue.js frontend that reduced load time by 40% and increased engagement by 35%.",
        "Helped scale frontend applications from 5,000 to 10,000 daily active users.",
        "Created internal productivity tools that reduced manual workload by 40%.",
        "Developed reusable, maintainable component architecture using Vue best practices.",
      ],
    }],
  },
  {
    company: "Irving Materials Inc.", where: "Greenfield, IN", status: "completed",
    roles: [{
      title: "Full Stack Software Engineer", period: "Mar 2020 – Mar 2022",
      bullets: [
        "Built internal tools using SQL, Express, React, and Node to improve employee efficiency.",
        "Delivered secure and scalable software aligned with modern coding and architecture standards.",
        "Integrated REST and GraphQL third-party APIs to expand functionality and improve UX.",
        "Collaborated with cross-functional stakeholders to ship high-quality products on schedule.",
      ],
    }],
  },
  {
    company: "IUPUI", where: "Indiana University Purdue University Indianapolis", status: "training",
    roles: [{ title: "Studies", period: "Aug 2018 – May 2021", bullets: [] }],
  },
];

/**
 * Projects, carried over from the old /projects page. Not on the page right now: waiting on real
 * client work and testimonials. To bring it back, render <Chronicles /> in src/pages/index.astro
 * and add "chronicles" to SECTION_IDS below.
 */
export const DEEDS: Deed[] = [
  {
    name: "This site",
    summary: "A portfolio that doubles as proof of the custom-code pitch.",
    solution: "Static Astro site with a hand-written raycaster dungeon intro and no runtime framework.",
    stack: ["Astro", "TypeScript", "Canvas 2D"],
    role: "Designed, engineered, and launched end-to-end.",
    // TODO: add the repo link once it's public: link: { label: "View source code", href: "..." }
  },
  {
    name: "Aptible Dashboard (Modernized)",
    summary: "An updated customer dashboard rebuilt with a more modern frontend stack.",
    problem: "Legacy implementation made feature work slower and harder to maintain.",
    solution: "Helped migrate features to a Vite + React architecture and implemented customer-support tooling.",
    impact: "Improved development velocity and made ongoing feature delivery more maintainable.",
    stack: ["Vite (React)", "Ruby on Rails", "PostgreSQL", "Docker", "AWS"],
    role: "Migrated features, built new functionality, and collaborated across product/support needs.",
  },
  {
    name: "Aptible Legacy Customer Dashboard",
    summary: "Maintained and extended a legacy Ember.js customer dashboard.",
    problem: "The codebase was older Ember, and original context had been lost over time.",
    solution: "Quickly ramped on legacy Ember patterns to maintain momentum and deliver required updates.",
    impact: "Kept critical product workflows stable while new platform improvements progressed.",
    stack: ["Ember.js", "Ruby on Rails", "PostgreSQL", "Docker", "AWS"],
    role: "Owned maintenance and feature changes in a high-context legacy environment.",
  },
  {
    name: "IVM Customer + Internal Dashboard",
    summary: "A dashboard platform for vending machine operations and customer workflows.",
    problem: "Teams needed better operational visibility and tooling around machine workflows.",
    solution: "Built frontend experiences and partnered with support/backend teams to ship features quickly.",
    impact: "Delivered more usable workflows for customers and internal teams in one platform.",
    stack: ["Vue.js", "Vuex", "ASP.NET Core", "MySQL", "Azure"],
    role: "Solo frontend developer responsible for UI delivery and feature implementation.",
  },
  {
    name: "Irving Materials Internal Applications",
    summary: "Internal applications platform used across multiple business departments.",
    problem: "Department-specific processes relied on slower, more manual workflows.",
    solution: "Built role-specific internal apps for parts tracking and customer pricing operations.",
    impact: "Improved process efficiency and reduced manual overhead for business-critical teams.",
    stack: ["React", "Redux", "Node.js", "Express", "MySQL", "AWS"],
    role: "Part of a small team designing and implementing internal business software.",
  },
];

export const abilityMod = (score: number) => Math.floor((score - 10) / 2);
export const fmtMod = (m: number) => (m >= 0 ? "+" : "") + m;

export function experience(now = new Date()) {
  const years = (now.getTime() - new Date(PROFILE.careerStart).getTime()) / (365.25 * 864e5);
  const level = Math.floor(years);
  return { years, level, progress: years - level };
}

/** Section ids the dungeon doors and old-route redirects point at. */
export const SECTION_IDS = ["top", "abilities", "armory", "spellbook", "quest-log", "tavern"];
