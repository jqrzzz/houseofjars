interface IconProps {
  className?: string;
}

const base = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} data-arrow="">
      <path d="M4 10h11.5M11 5.5 15.5 10 11 14.5" />
    </svg>
  );
}

export function ExternalIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 4.5H5.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V12M11 4.5h4.5V9M15.5 4.5 9 11" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 16.5 4.6 13A6.8 6.8 0 1 1 7.3 15.5Z" />
      <path d="M7.6 7.4c.2-.5.9-.6 1.1-.1l.5 1.2c.1.3 0 .5-.2.7l-.4.4c.4.9 1.1 1.6 2 2l.4-.4c.2-.2.4-.3.7-.2l1.2.5c.5.2.4.9-.1 1.1-2.4 1-6.1-2.7-5.2-5.2Z" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="14" height="10.5" rx="1.5" />
      <path d="m3.5 6 6.5 5 6.5-5" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6.2 3.5h-1.7A1.2 1.2 0 0 0 3.3 4.8C3.6 11 9 16.4 15.2 16.7a1.2 1.2 0 0 0 1.3-1.2v-1.7a1 1 0 0 0-.7-1l-2.4-.8a1 1 0 0 0-1 .3l-1 1.1a9.5 9.5 0 0 1-3.8-3.8l1.1-1a1 1 0 0 0 .3-1l-.8-2.4a1 1 0 0 0-1-.7Z" />
    </svg>
  );
}

export function RestartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4.5 3.5v3h3" />
    </svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 16V4.5M5 9l5-5 5 5" />
    </svg>
  );
}
