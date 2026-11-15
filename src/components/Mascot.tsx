import Image from "next/image";
import type { SpriteId } from "@/lib/types";

// Placeholder line-art sprites live in public/sprites/<id>.svg. Swap in the
// hand-drawn art with the same file names and nothing else needs to change.
export function Mascot({
  sprite,
  size = 40,
  className,
}: {
  sprite: SpriteId | "carry-1" | "carry-2";
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/sprites/${sprite}.svg`}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 ${className ?? ""}`}
      unoptimized
      draggable={false}
    />
  );
}
