import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 22, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const BackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 5 8 12l7 7" />
  </Icon>
);

// Mini version of the board and clip, drawn like the sprites: flat fills, ink outline.
export const ClipboardIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="22" height="25" rx="2.5" fill="#c99a6e" stroke="#1f1c19" strokeWidth="2" />
    <rect x="8" y="9" width="16" height="18.5" rx="1" fill="#fff" stroke="#1f1c19" strokeWidth="1.6" />
    <path d="M11 2.5 H21 L22.5 9 H9.5 Z" fill="#d6d6d2" stroke="#1f1c19" strokeWidth="2" />
    <path d="M11 14.5 l1.6 1.6 l3 -3.3 M18 15 h3.5 M11 21.5 h2.6 M18 21.5 h3.5" stroke="#1f1c19" strokeWidth="1.6" />
  </svg>
);

export const GearIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
  </Icon>
);

export const BookmarkIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p}>
    <path d="M6 3.5h12v17l-6-4.5-6 4.5z" fill={filled ? "currentColor" : "none"} />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
);

export const TriangleIcon = ({ open, ...p }: IconProps & { open?: boolean }) => (
  <Icon {...p} style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform 150ms" }}>
    <path d="M9 6l7 6-7 6z" fill="currentColor" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
);

export const ExternalIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p}>
    <path
      d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
      fill={filled ? "currentColor" : "none"}
    />
  </Icon>
);
