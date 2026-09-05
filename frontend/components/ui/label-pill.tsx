import { Label } from "@/lib/types";

export function LabelPill({ label }: { label: Label }) {
  return (
    <span
      className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium leading-none"
      style={{
        backgroundColor: `${label.color}1A`,
        color: label.color,
      }}
    >
      {label.name}
    </span>
  );
}
