import { PfpGenerator } from "@/components/pfp-generator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PFP Generator | Cambrilio",
  description: "Create your unique Cambrilio character by mixing and matching traits.",
}

export default function GeneratorPage() {
  return <PfpGenerator />
}
