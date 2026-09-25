import { Camera, Clock, MapPin, Receipt, UserRound, Wrench } from "lucide-react";

const record = [
  { key: "Who", icon: UserRound, body: "The assigned person or partner who handled the work." },
  { key: "What", icon: Wrench, body: "The service performed, and what was found." },
  { key: "When", icon: Clock, body: "The date and time of each visit or action." },
  { key: "Where", icon: MapPin, body: "The property or location, recorded privately." },
  { key: "Proof", icon: Camera, body: "Photos, videos and a written report." },
  { key: "Cost", icon: Receipt, body: "Quotation, your approval, and the final invoice." },
];

/** The six questions every service record answers — a quiet hairline grid. */
export function TrustRecord() {
  return (
    <dl className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {record.map(({ key, icon: Icon, body }) => (
        <div key={key} className="bg-surface p-5 sm:p-7">
          <dt className="text-label flex items-center gap-2 text-brand">
            <Icon aria-hidden className="size-3.5" strokeWidth={2} />
            {key}
          </dt>
          <dd className="mt-2 text-[0.9375rem] text-ink sm:mt-2.5 sm:text-base">{body}</dd>
        </div>
      ))}
    </dl>
  );
}
