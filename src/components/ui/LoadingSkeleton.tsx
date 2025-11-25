function ProjectCardSkeleton() {
    return (
        <div className="bg-card rounded-lg border border-border p-4 animate-pulse">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2 mb-4">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-5/6" />
            </div>

            {/* Badges */}
            <div className="flex gap-2 mb-4">
                <div className="h-6 bg-muted rounded-full w-20" />
                <div className="h-6 bg-muted rounded-full w-24" />
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
            </div>

            {/* Button */}
            <div className="h-10 bg-muted rounded" />
        </div>
    );
}

export function MarketplaceLoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <ProjectCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function ProjectDetailsLoadingSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
            {/* Back button */}
            <div className="h-10 bg-muted rounded w-48" />

            {/* Main card */}
            <div className="bg-card rounded-lg border border-border p-8 space-y-6">
                {/* Title */}
                <div className="space-y-3">
                    <div className="h-8 bg-muted rounded w-3/4" />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-full" />
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded w-1/3" />
                            <div className="h-3 bg-muted rounded w-1/4" />
                        </div>
                    </div>
                </div>

                {/* Quick info grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-3 bg-muted rounded w-16" />
                            <div className="h-4 bg-muted rounded w-24" />
                        </div>
                    ))}
                </div>

                {/* Description */}
                <div className="space-y-3">
                    <div className="h-5 bg-muted rounded w-48" />
                    <div className="space-y-2">
                        <div className="h-4 bg-muted rounded" />
                        <div className="h-4 bg-muted rounded" />
                        <div className="h-4 bg-muted rounded w-5/6" />
                    </div>
                </div>

                {/* Price section */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-24" />
                        <div className="h-8 bg-muted rounded w-32" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-24" />
                        <div className="h-6 bg-muted rounded w-16" />
                    </div>
                </div>
            </div>

            {/* Action card */}
            <div className="bg-card rounded-lg border border-border p-8">
                <div className="h-6 bg-muted rounded w-48 mb-4" />
                <div className="h-4 bg-muted rounded mb-6" />
                <div className="h-12 bg-muted rounded" />
            </div>
        </div>
    );
}
