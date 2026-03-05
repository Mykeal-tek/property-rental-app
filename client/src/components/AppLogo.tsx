import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  compact?: boolean;
};

export default function AppLogo({
  className,
  markClassName,
  textClassName,
  compact = false,
}: AppLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/brand/afie-wura-mark.svg"
        alt="Afie Wura logo"
        className={cn("h-9 w-9 rounded-xl", markClassName)}
      />
      {!compact && (
        <div className={cn("leading-none", textClassName)}>
          <p className="text-brand text-2xl font-extrabold uppercase tracking-[0.1em]">Afie Wura</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Premium Rentals
          </p>
        </div>
      )}
    </div>
  );
}
