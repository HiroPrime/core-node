import type { Metadata } from "next";
import { PressStart } from "@/components/PressStart";

export const metadata: Metadata = {
  title: "Core Node — Basic Hero",
  description:
    "The Nexus of Charlie, Jacob, and BasicHiro. Non-binary solo developer. Product designer first, developer second. Vibe code with Cursor, paint with local Comfy.",
};

export default function Page() {
  return <PressStart />;
}
