import { ArrowDown, ArrowUp, AlertTriangle, Minus } from "lucide-react";
import { Priority } from "@/lib/types";

export const priorityMeta: Record<
  Priority,
  { label: string; color: string; icon: typeof ArrowUp }
> = {
  low: { label: "Low", color: "#8F8F98", icon: ArrowDown },
  medium: { label: "Medium", color: "#C97B1D", icon: Minus },
  high: { label: "High", color: "#5750F1", icon: ArrowUp },
  urgent: { label: "Urgent", color: "#D64545", icon: AlertTriangle },
};

export function PriorityIcon({ priority, size = 13 }: { priority: Priority; size?: number }) {
  const meta = priorityMeta[priority];
  const Icon = meta.icon;
  return (
    <span title={`${meta.label} priority`} style={{ color: meta.color }} className="inline-flex">
      <Icon size={size} strokeWidth={2.4} />
    </span>
  );
}
