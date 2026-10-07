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
    let cancelled = false;
    // Rocket's hosted control uses an open Shadow DOM. Expose semantic parts
    // so host applications can style presentation without replacing behavior.
    void customElements.whenDefined("rocket-button").then(() => {
      const shadow = ref.current?.shadowRoot;
      if (cancelled || !shadow) return;
      shadow.querySelector("button")?.setAttribute("part", "control");
      shadow.querySelector(".mark")?.setAttribute("part", "mark");
      shadow.querySelector(".label")?.setAttribute("part", "label");
      shadow.querySelector(".spinner")?.setAttribute("part", "spinner");
      shadow.querySelector(".status")?.setAttribute("part", "status");
    });

    return () => { cancelled = true; };
  }, []);
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
  return <rocket-button ref={ref} className={className} {...attrs} />;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "rocket-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { action?: string; variant?: string; loading?: string; disabled?: string };
    }
  }
}
