/**
 * The Operator, the Machinery, and the Creed.
 *
 * The person at the center, the stack named as the parts of the world it is,
 * and the five rules the house runs on. Copy follows content/lore.md.
 */

export const OPERATOR = {
  names: ["Charlie", "Jacob", "BasicHiro"],
  penName: "BasicHiro",
  role: "Non-binary solo developer. Product designer first, developer second.",
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
    note: "Where every picture is made. Local, on her own iron.",
    machines: [
      {
        name: "The Furnace",
        reality: "ComfyUI, port 8188, on the Omen. Nothing else is allowed to start it.",
      },
      { name: "The Painter", reality: "Qwen-Image-Edit-2511. Faces, bodies, every cut." },
      { name: "The Scribe", reality: "Haiku. Writes words. Never touches a pixel." },
      {
        name: "The Home Brains",
        reality: "Ollama. Models on her own iron. No cloud, no permission, no bill.",
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
      { name: "The Chair", reality: "Cursor. Speech in, products out." },
      { name: "The Wire", reality: "Next.js and React, front to back." },
      { name: "The Skin", reality: "Tailwind. The house wears one palette: void and gold." },
    ],
  },
  {
    group: "The House",
    note: "What remembers, what charges, what tells her phone.",
    machines: [
      { name: "The Ledger", reality: "Supabase. What the house remembers." },
      { name: "The Toll", reality: "Stripe." },
      { name: "The Messenger", reality: "Resend." },
      { name: "The Ping", reality: "ntfy. Every approval arrives as a tap on her phone." },
      { name: "The Gate", reality: "Vercel. The only thing between the desk and the public." },
    ],
  },
  {
    group: "The Machines",
    note: "Two boxes, two jobs.",
    machines: [
      { name: "The Omen", reality: "The GPU machine. Draws. Does not run Cursor while it draws." },
      { name: "The EliteDesk", reality: "The conductor's desk. Cursor, browser, and the grade." },
    ],
  },
];

export const CREED = [
  { line: "Free until it Works.", note: "No account needed to see it work." },
  {
    line: "She Approves, Denies, or Adjusts.",
    note: "Nothing ships to a customer until she sends it.",
  },
  { line: "One page at a time.", note: "Small first, then grow. Not an empire on day one." },
  { line: "Pictures are Comfy only.", note: "No substitutes." },
  { line: "Nothing goes out until she hits the button.", note: "That is the whole rule." },
];

export const COPY_BANK = [
  "This is not a company page. This is me.",
  "I vibe code with Cursor and paint with local Comfy.",
  "I talk more than I type, and then we make the thing.",
  "I'm a non-binary solo developer.",
  "Every Node is something I built. Some are live. Some are benched. All of them are mine.",
];
