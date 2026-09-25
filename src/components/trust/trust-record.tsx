import { Camera, Clock, MapPin, Receipt, UserRound, Wrench } from "lucide-react";
import { FeatureCard } from "@/components/ui/card";

const record = [
  { key: "Who", icon: UserRound, body: "The assigned person or partner who handled the work." },
  { key: "What", icon: Wrench, body: "The service performed, and what was found." },
  { key: "When", icon: Clock, body: "The date and time of each visit or action." },
  { key: "Where", icon: MapPin, body: "The property or location, recorded privately." },
  { key: "Proof", icon: Camera, body: "Photos, videos and a written report." },
  { key: "Cost", icon: Receipt, body: "Quotation, your approval, and the final invoice." },
];

/** The six questions every service record should answer. */
export function TrustRecord() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {record.map((r) => (
        <FeatureCard
          key={r.key}
          icon={r.icon}
          compact
          className="reveal"
          title={<span className="text-xs font-semibold tracking-[0.16em] text-brand uppercase">{r.key}</span>}
        >
          <p className="text-base text-ink">{r.body}</p>
        </FeatureCard>
      ))}
    </ul>
  );
}
