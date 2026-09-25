import { EyeOff, FileLock2, SlidersHorizontal, UserCheck } from "lucide-react";

const principles = [
  { title: "Private by default", icon: EyeOff, body: "Customer information is never publicly displayed." },
  { title: "Controlled visibility", icon: SlidersHorizontal, body: "Each property listing has a visibility level that you control." },
  { title: "Secure documents", icon: FileLock2, body: "Important documents belong inside your private customer workspace, not in email threads." },
  { title: "Role-based access", icon: UserCheck, body: "Staff, partners and family members see only what they need for their role." },
];

/** The four privacy principles as a quiet hairline list. */
export function PrivacyPrinciples() {
  return (
    <ul className="divide-y divide-line-subtle border-y border-line-subtle">
      {principles.map(({ title, icon: Icon, body }) => (
        <li key={title} className="grid grid-cols-[1.25rem_1fr] gap-x-4 py-4">
          <Icon aria-hidden className="mt-0.5 size-[1.125rem] text-brand" strokeWidth={1.75} />
          <div>
            <h3 className="text-[0.9375rem] font-semibold tracking-tight text-ink">{title}</h3>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
