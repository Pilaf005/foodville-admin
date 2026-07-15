/**
 * Loading skeletons. Each mirrors the real component's box model so swapping
 * skeleton → content causes no layout shift (no flicker, no jump).
 */

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-cardline/60 ${className}`} />;
}

/** Matches a ProductCard cell. */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-cardline bg-white">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-2 sm:p-3">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

/** Matches ProductGrid's responsive columns. */
export function ProductGridSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches a BlogCard cell. */
export function BlogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-cardline bg-white">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function BlogGridSkeleton({ count = 6, className = "grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3" }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <BlogCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches the round category tiles on the home page. */
export function CategoryFilterSkeleton({ count = 8 }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-2 py-6 sm:px-0 sm:py-8">
      <div className="grid w-full grid-cols-4 justify-items-center gap-x-2.5 gap-y-6 sm:grid-cols-8 sm:gap-x-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex w-full flex-col items-center gap-2">
            <Skeleton className="h-14 w-14 rounded-full sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
