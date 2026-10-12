import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";

const posthogToken = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY;
if (posthogToken) {
  const region = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION || "eu";
  posthog.init(posthogToken, {
    api_host: region === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  });
}

createRoot(document.getElementById("root")!).render(<App />);
