/**
 * The Operator, the Machinery, and the Creed.
 *
 * The person at the center, the stack named as the parts of the world it is,
 * and the five rules the house runs on. Copy follows content/lore.md.
 */

export const OPERATOR = {
  /** The standard name. Jacob and Charlie are the same person and both are true. */
  name: "BasicHiro",
  alsoKnownAs: ["Jacob", "Charlie"],
  names: ["BasicHiro", "Jacob", "Charlie"],
  penName: "BasicHiro",
  role: "Non-binary solo developer. Product designer first, developer second.",
  /** One line of who this is. Goes at the top of the Rack and the manifesto. */
  intro: "I'm BasicHiro — a non-binary solo developer and AI vibe coder.",
  creed: "Free. Break the Server. Flood the Queue. Put her to work.",
  email: "basichiro@corenode.nexus",
  linkedin: "https://www.linkedin.com/in/jacobclovell",
  x: "https://x.com/basic_hiro",
};

export interface Machine {
  name: string;
  reality: string;
}

export interface MachineGroup {
  group: string;
  note: string;
  machines: Machine[];
}

export const MACHINERY: MachineGroup[] = [
  {
    group: "The Forge",
    note: "Where every picture is made. Local, on my own iron.",
    machines: [
      {
        name: "The Furnace",
        reality: "ComfyUI, port 8188, on the Omen. Nothing else is allowed to start it.",
      },
      { name: "The Painter", reality: "Qwen-Image-Edit-2511. Faces, bodies, every cut." },
      { name: "The Scribe", reality: "Haiku. Writes words. Never touches a pixel." },
      {
        name: "The Home Brains",
        reality: "Ollama. Models on my own iron. No cloud, no permission, no bill.",
      },
      {
        name: "The Rig",
        reality:
          "ControlNet, InstantX, Multiple-Angles, LoRAs. Keeps a Character looking like the same Character.",
      },
      { name: "The Cut", reality: "Sharp. Crops, pads, and plates." },
    ],
  },
  {
    group: "The Desk",
    note: "Where talking becomes building.",
    machines: [
      { name: "The Chair", reality: "Cline. Speech in, products out." },
      { name: "The Wire", reality: "Next.js and React, front to back." },
      { name: "The Skin", reality: "Tailwind. The house wears one palette: void and gold." },
    ],
  },
  {
    group: "The House",
    note: "What remembers and what charges.",
    machines: [
      { name: "The Ledger", reality: "Supabase. What the house remembers." },
      { name: "The Toll", reality: "Stripe." },
      { name: "The Messenger", reality: "Resend." },
      { name: "The Gate", reality: "Vercel. The only thing between the desk and the public." },
    ],
  },
  {
    group: "The Machines",
    note: "Two boxes, two jobs.",
    machines: [
      { name: "The Omen", reality: "The GPU machine." },
      { name: "The EliteDesk", reality: "The desk box. Everything but the drawing happens here." },
    ],
  },
];

export const CREED = [
  { line: "Free until it Works.", note: "No account needed to see it work." },
  {
    line: "The Taste Is Mine.",
    note: "The machines make the work. I decide what is good enough to go out.",
  },
  { line: "One page at a time.", note: "Small first, then grow. Not an empire on day one." },
  { line: "Pictures are Comfy only.", note: "No substitutes." },
  { line: "Nothing goes out until I hit the button.", note: "That is the whole rule." },
];

export const COPY_BANK = [
  "This is not a company page. This is me.",
  "I vibe code with Cursor and paint with local Comfy.",
  "I talk more than I type, and then we make the thing.",
  "I'm a non-binary solo developer.",
  "Every Node is something I built. Some are live. Some are benched. All of them are mine.",
];

/**
 * The story behind the rack. Shown at the top of the Stack page, before any of
 * the hardware — because the machines only make sense once you know who runs
 * them and why. Written from the Operator's own words.
 */
export const STACK_STORY = [
  "This is not a data center. It's a desk, two boxes, and one person.",
  "I'm not a trained coder. I'm a product owner and a designer first — my hours go into the product, the UI, the UX. The part a customer actually touches and decides to love.",
  "And it's just me. So AI isn't a gimmick in this house; it's how one person covers the ground of a team. Every machine in this rack exists to make my hands stronger.",
  "All of it runs on my own computer, on my own power, until it starts paying its way. No cloud bills, no gatekeepers, no permission.",
  "And I'm not finished. The rack keeps growing because I keep learning — finding more leverage, building more of the things people need and want.",
];
