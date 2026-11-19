import { cn } from "@/lib/utils";
import { DEFAULT_SITE_NAME } from "@/lib/site-settings";

/**
 * The Rent Ghar mark and wordmark.
 *
 * A rounded tile in the brand colour holding a white house with an arched
 * door, and one warm dot (the price-tag colour) where the key turns — "a
 * home you can move into". Still, never animated. The tile carries its own
 * background, so the mark reads the same on the white header and on the dark
 * footer.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect x="2" y="2" width="96" height="96" rx="26" className="fill-primary" />
      <path
        d="M20 50 L50 24 L80 50 V76 a6 6 0 0 1 -6 6 H26 a6 6 0 0 1 -6 -6 Z"
        fill="#ffffff"
      />
      <path d="M41 82 V64 a9 9 0 0 1 18 0 V82 Z" className="fill-primary" />
      <circle cx="50" cy="45" r="6" style={{ fill: "var(--price-tag, #ea580c)" }} />
    </svg>
  );
}

export function BrandLogo({
  className,
  markClassName,
  textClassName,
  name = DEFAULT_SITE_NAME,
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  /** The site name (Settings → Site name); its last word takes the brand colour. */
  name?: string;
}) {
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop()! : "";
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <BrandMark className={cn("h-8 w-8", markClassName)} />
      <span
        className={cn(
          "text-[19px] font-extrabold leading-none tracking-tight",
          textClassName,
        )}
      >
        {words.join(" ")}
        {last && (
          <>
            {" "}
            <span className="text-primary">{last}</span>
          </>
        )}
      </span>
    </span>
  );
}
