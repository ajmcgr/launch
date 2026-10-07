import { useEffect, useRef, useState } from "react";

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

const launchAuthStyles = `
  :host { display: block; width: 100%; }
  button {
    width: 100%;
    min-height: 40px;
    padding: 8px 16px;
    border: 1px solid hsl(0 0% 90%);
    border-radius: 0.375rem;
    background: hsl(0 0% 100%);
    color: hsl(0 0% 22%);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
  }
  button:hover:not(:disabled) { background: hsl(0 0% 96%); filter: none; }
  button:active:not(:disabled) { transform: none; }
  button:focus-visible { outline: 2px solid hsl(213 60% 50%); outline-offset: 2px; box-shadow: none; }
  button:disabled { background: hsl(0 0% 96%); color: hsl(0 0% 40%); border-color: hsl(0 0% 90%); }
`;

// Official hosted Rocket Button. The component only renders; our existing flow runs on rocket-activate.
export default function RocketButton({ action, variant = "primary", loading, disabled, onActivate, className }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const showPlaceholder = className?.split(/\s+/).includes("launch-auth-rocket-button") && !ready;
  const handler = useRef(onActivate);
  handler.current = onActivate;
  useEffect(() => { loadScript(); }, []);
  useEffect(() => {
    let cancelled = false;
    const host = ref.current;
    if (!host) return;

    // React forwards className to custom elements as a `classname` attribute,
    // rather than the real class attribute. Set it explicitly so host styles
    // and this auth-only Shadow DOM override can reliably target the control.
    if (className) host.className = className;
    else host.removeAttribute("class");

    // Rocket's hosted control uses an open Shadow DOM. Expose semantic parts
    // so host applications can style presentation without replacing behavior.
    void customElements.whenDefined("rocket-button").then(() => {
      const shadow = host?.shadowRoot;
      if (cancelled || !shadow) return;
      shadow.querySelector("button")?.setAttribute("part", "control");
      shadow.querySelector(".mark")?.setAttribute("part", "mark");
      shadow.querySelector(".label")?.setAttribute("part", "label");
      shadow.querySelector(".spinner")?.setAttribute("part", "spinner");
      shadow.querySelector(".status")?.setAttribute("part", "status");

      // Rocket's own stylesheet is scoped inside Shadow DOM. This auth-only
      // override follows it, giving Launch the same visual affordance as its
      // Google and GitHub controls without changing provider behavior.
      if (host.classList.contains("launch-auth-rocket-button") && !shadow.querySelector("style[data-launch-auth-rocket]")) {
        const style = document.createElement("style");
        style.dataset.launchAuthRocket = "";
        style.textContent = launchAuthStyles;
        shadow.append(style);
      }
      if (shadow.querySelector("button")) setReady(true);
    });

    return () => { cancelled = true; };
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
  return <>
    {showPlaceholder && <button
      type="button"
      disabled
      aria-busy="true"
      className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground"
    >Continue with Rocket</button>}
    <rocket-button ref={ref} {...attrs} style={showPlaceholder ? { display: "none" } : undefined} />
  </>;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "rocket-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { action?: string; variant?: string; loading?: string; disabled?: string };
    }
  }
}
