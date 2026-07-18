import { redirect } from "next/navigation";

/** Legacy Explore URL — Core Node home now lives at / */
export default function PlanetRedirect() {
  redirect("/");
}
