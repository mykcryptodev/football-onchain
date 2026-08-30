import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Shared masthead for interior routes. Keeps the eyebrow / headline / support
 * text rhythm identical everywhere so the app reads as one surface instead of
 * a set of pages that each invented their own heading scale.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="label-eyebrow text-brand mb-2.5">{eyebrow}</p>
          )}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-3 text-base">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 pb-1">{actions}</div>
        )}
      </div>
      {/* Hairline rule with a short brand tick — the quiet signature that
          repeats on every page. */}
      <div className="border-border relative mt-6 border-t">
        <span className="bg-brand absolute -top-px left-0 h-px w-10" />
      </div>
    </header>
  );
}
