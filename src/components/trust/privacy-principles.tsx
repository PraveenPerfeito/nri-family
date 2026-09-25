import { EyeOff, FileLock2, SlidersHorizontal, UserCheck } from "lucide-react";
import { FeatureCard } from "@/components/ui/card";

const principles = [
  { title: "Private by default", icon: EyeOff, body: "Customer information is never publicly displayed." },
  { title: "Controlled visibility", icon: SlidersHorizontal, body: "Each property listing has a visibility level that you control." },
  { title: "Secure documents", icon: FileLock2, body: "Important documents belong inside your private customer workspace, not in email threads." },
  { title: "Role-based access", icon: UserCheck, body: "Staff, partners and family members see only what they need for their role." },
];

export function PrivacyPrinciples() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {principles.map((p) => (
        <FeatureCard key={p.title} icon={p.icon} title={p.title} compact className="reveal">
          {p.body}
        </FeatureCard>
      ))}
    </ul>
  );
}
