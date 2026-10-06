import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { completeRocketLogin, readSession, rocketRequest, signOutRocket, startRocketLogin } from "@/lib/rocketAcceptance";
import RocketButton from "@/components/RocketButton";

export default function RocketAcceptance() {
  const location = useLocation();
  const navigate = useNavigate();
  const started = useRef(false);
  const [signedIn, setSignedIn] = useState(() => !!readSession());
  const [active, setActive] = useState(false);
  const [offer, setOffer] = useState<{ available: boolean; buy_url: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const checkAccess = async () => {
    setBusy(true); setActive(false); setMessage("");
    try {
      const status = await rocketRequest("status", {}, true);
      if (status.active) {
        const resource = await rocketRequest("protected", {}, true);
        setActive(true); setMessage(resource.message);
      } else setMessage("No active acceptance purchase yet.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void rocketRequest("offer").then(setOffer).catch(() => setOffer(null));
    if (location.pathname === "/rocket/callback") {
      const query = sessionStorage.getItem("launch:rocket:callback") || location.search;
      sessionStorage.removeItem("launch:rocket:callback");
      // Remove credentials from the address bar before loading any other page.
      window.history.replaceState(null, "", "/rocket/callback");
      setBusy(true);
      void completeRocketLogin(query).then(() => {
        setSignedIn(true); navigate("/rocket/acceptance", { replace: true });
        return checkAccess();
      }).catch(error => { setMessage(error.message); setBusy(false); });
    } else if (readSession()) void checkAccess();
  }, []);
  const continueWithRocket = async () => {
    setBusy(true); setMessage("");
    try { await startRocketLogin(); } catch (error) { setMessage((error as Error).message); setBusy(false); }
  };
  return <main className="mx-auto max-w-xl px-6 py-16 space-y-6">
    <Helmet><title>Rocket acceptance · Launch</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <h1 className="text-3xl font-bold">Launch with Rocket</h1>
    <p>This controlled acceptance area is for a new Buy with Rocket purchase. Your existing Launch account and Launch Pass stay the same.</p>
    <p>The temporary acceptance plan is $1 USD per month, recurring until canceled. It unlocks this area only.</p>
    {!signedIn ? <RocketButton action="continue" variant="primary" loading={busy} disabled={busy} onActivate={continueWithRocket} /> : <div className="flex gap-3">
      <button className="rounded-lg border px-5 py-3" disabled={busy} onClick={checkAccess}>Check access</button>
      <button className="rounded-lg border px-5 py-3" disabled={busy} onClick={() => { signOutRocket(); setSignedIn(false); setActive(false); setMessage(""); }}>Sign out of Rocket</button>
    </div>}
    {active ? <div className="space-y-3"><p role="status" className="rounded-lg border border-primary p-4">{message}</p><button className="rounded-lg border px-5 py-3" disabled={busy} onClick={async () => { setBusy(true); try { await rocketRequest("proof", {}, true); setMessage("Your new purchase and Launch access are verified."); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }}>Verify acceptance</button></div> : <>
      {offer?.available ? <div className="space-y-1"><RocketButton action="buy" variant="primary" onActivate={() => window.location.assign(offer.buy_url)} /><p className="text-sm text-muted-foreground">$1 USD/month, recurring until canceled.</p></div> : <><RocketButton action="buy" variant="primary" disabled onActivate={() => {}} /><p>Purchases are not open yet.</p></>}
      {message && <p role="status">{message}</p>}
    </>}
    <p className="text-sm text-muted-foreground">Manage Rocket purchases and connected apps in Rocket. This area does not change your Launch billing.</p>
  </main>;
}
