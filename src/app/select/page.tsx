import type { Metadata } from "next";
import { NodeSelect } from "@/components/NodeSelect";

export const metadata: Metadata = {
  title: "Select — Core Node",
  description: "The Grid. Every Node on one plane.",
};

export default function SelectPage() {
  return <NodeSelect />;
}
