import { useEffect } from "react";

const UMAMI_SHARE_URL = "https://cloud.umami.is/share/KJgFyfZqxqsGoawu/trylaunch.ai";

export default function Traffic() {
  useEffect(() => {
    window.location.replace(UMAMI_SHARE_URL);
  }, []);
  return (
    <div className="container max-w-7xl mx-auto px-4 py-16 text-center text-sm text-muted-foreground">
      Redirecting to Umami analytics…{" "}
      <a href={UMAMI_SHARE_URL} className="underline">Click here if not redirected</a>.
    </div>
  );
}
