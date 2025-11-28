import { Avatar as UIAvatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface AvatarProps {
    src?: string | null
    alt?: string
    size?: "sm" | "md" | "lg" | "xl"
    className?: string
}

const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
    xl: "h-24 w-24",
}

export default function Avatar({ src, alt, size = "md", className }: AvatarProps) {
    const initials = alt
        ? alt
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "??"

    return (
        <UIAvatar className={cn(sizeClasses[size], className)}>
            <AvatarImage src={src || undefined} alt={alt} />
            <AvatarFallback>{initials}</AvatarFallback>
        </UIAvatar>
    )
}
