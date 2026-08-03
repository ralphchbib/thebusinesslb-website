import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const ASPECT = 1505.76 / 221.28; // ≈ 6.8 : 1, matches the trimmed wordmark

export function Logo({
  variant = "ink",
  width = 132,
  className,
  priority,
}: {
  variant?: "ink" | "white";
  width?: number;
  className?: string;
  priority?: boolean;
}) {
  const src = variant === "ink" ? "/logo-wordmark-ink.svg" : "/logo-wordmark-white.svg";
  const height = Math.round(width / ASPECT);
  return (
    <Link href="/" aria-label="THE BUSINESS lb — home" className={cn("inline-flex", className)}>
      <Image
        src={src}
        alt="THE BUSINESS lb"
        width={width}
        height={height}
        priority={priority}
        style={{ width, height: "auto" }}
      />
    </Link>
  );
}
