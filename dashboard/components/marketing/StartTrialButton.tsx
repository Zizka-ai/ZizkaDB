import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { ManagedPlanId } from "@/lib/plans";
import { startTrialHref } from "@/lib/plans";

/**
 * Managed-cloud trial CTA. Pass `plan` to skip the picker (`/signup?plan=`).
 * Callers keep their own styles — this only centralizes the href.
 */
export function StartTrialButton({
  plan,
  children,
  style,
  className,
  onClick,
}: {
  plan?: ManagedPlanId;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link href={startTrialHref(plan)} style={style} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
