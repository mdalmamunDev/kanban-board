import clsx from "clsx";
import { User } from "@/lib/types";

export function Avatar({
  user,
  size = "sm",
  ring = false,
}: {
  user: User;
  size?: "xs" | "sm" | "md";
  ring?: boolean;
}) {
  const sizeClasses = {
    xs: "h-5 w-5 text-[10px]",
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-sm",
  }[size];

  return (
    <div
      title={user.name}
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        sizeClasses,
        ring && "ring-2 ring-surface"
      )}
      style={{ backgroundColor: user.color }}
    >
      {user.initials}
    </div>
  );
}

export function AvatarStack({ users, max = 3 }: { users: User[]; max?: number }) {
  if (users.length === 0) return null;
  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size="xs" ring />
      ))}
      {overflow > 0 && (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] font-medium text-ink-muted ring-2 ring-surface">
          +{overflow}
        </div>
      )}
    </div>
  );
}
