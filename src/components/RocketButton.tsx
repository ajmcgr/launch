import { useEffect, useRef } from "react";

const SRC = "https://tryrocket.ai/buttons/v1/rocket-buttons.js";

function loadScript() {
  if (document.querySelector(`script[src="${SRC}"]`)) return;
  const s = document.createElement("script");
  s.src = SRC;
  s.defer = true;
  document.head.appendChild(s);
}

type Props = {
  action: "continue" | "buy";
  variant?: "primary" | "dark" | "light";
  loading?: boolean;
  disabled?: boolean;
  onActivate: () => void;
  className?: string;
};

// Official hosted Rocket Button. The component only renders; our existing flow runs on rocket-activate.
export default function RocketButton({ action, variant = "primary", loading, disabled, onActivate, className }: Props) {
  const ref = useRef<HTMLElement>(null);
  const handler = useRef(onActivate);
  handler.current = onActivate;
  useEffect(() => { loadScript(); }, []);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (className) host.className = className;
    else host.removeAttribute("class");
  }, [className]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const listener = () => { if (!disabled && !loading) handler.current(); };
    el.addEventListener("rocket-activate", listener);
    return () => el.removeEventListener("rocket-activate", listener);
  }, [disabled, loading]);
  const attrs: Record<string, string> = { action, variant };
  if (loading) attrs.loading = "";
  if (disabled) attrs.disabled = "";
  return <rocket-button ref={ref} {...attrs} />;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "rocket-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { action?: string; variant?: string; loading?: string; disabled?: string };
    }
  }
}
