export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-stone-200 rounded ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-stone-100 border border-stone-200 rounded-[6px] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-2.5 h-2.5 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
