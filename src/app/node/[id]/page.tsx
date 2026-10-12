import type { Metadata } from "next";
import { NodeBriefing } from "@/components/NodeBriefing";
import { getNode, NODES } from "@/lib/universe";

/**
 * One page per Node, statically generated from the Grid. A new Node in
 * universe.ts gets its own briefing page at build time with no other work.
 */
export function generateStaticParams() {
  return NODES.map((node) => ({ id: node.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const node = getNode(id);

  return {
    title: node ? `${node.name} — Core Node` : "Node — Core Node",
    description: node?.brief.what ?? "A Node in the Grid.",
  };
}

export default async function NodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NodeBriefing id={id} />;
}
