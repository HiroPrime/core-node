import type { Metadata } from "next";
import { StackPage } from "@/components/StackPage";

export const metadata: Metadata = {
  title: "The Machinery — Core Node",
  description:
    "ComfyUI, Ollama, Qwen, Cursor, Next, Supabase — and what each one is called inside the world.",
};

export default function Stack() {
  return <StackPage />;
}
