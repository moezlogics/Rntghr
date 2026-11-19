"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Primary/secondary buttons, rendered top-right. */
  actions?: ReactNode;
  /** Small count/status chips rendered under the title. */
  meta?: ReactNode;
  className?: string;
}

/**
 * One header treatment for every dashboard page, so titles, descriptions and
 * primary actions land in the same place on all 27 screens.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[20px] font-bold tracking-tight text-slate-900 sm:text-[24px]">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-[13px] text-slate-500 sm:text-sm">{description}</p>
        )}
        {meta && (
          <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:max-sm:flex-1">
          {actions}
        </div>
      )}
    </div>
  );
}
