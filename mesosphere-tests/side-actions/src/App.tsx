import { useMemo, useState } from "react";
import { callread, callsideaction } from "mesosphere/reactlibrary";
import { api } from "../mesosphere/deploy";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$15",
    amount: 1500,
    description: "Personal projects and prototypes.",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    amount: 4900,
    description: "Growing teams shipping production apps.",
  },
  {
    id: "team",
    name: "Team",
    price: "$99",
    amount: 9900,
    description: "Scale up with advanced collaboration.",
  },
] as const;

function formatCurrency(amount?: number, currency?: string) {
  if (amount == null) {
    return "-";
  }
  const safeCurrency = (currency || "USD").toUpperCase();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export default function App() {
  const checkouts = callread(api.message.readCheckouts);
  const createCheckout = callsideaction(api.message.createCheckoutSession);

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const status = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return new URLSearchParams(window.location.search).get("checkout");
  }, []);

  async function handleCheckout(planId: (typeof PLANS)[number]["id"]) {
    if (typeof window === "undefined") {
      return;
    }
    setError("");
    setIsLoading(planId);
    try {
      const successUrl = `${window.location.origin}?checkout=success`;
      const cancelUrl = `${window.location.origin}?checkout=cancel`;
      const response = await createCheckout({
        plan: planId,
        successUrl,
        cancelUrl,
        customerEmail: email.trim() || undefined,
      });
      if (response?.url) {
        window.location.assign(response.url);
        return;
      }
      setError("Stripe did not return a checkout URL. Check the server logs.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start checkout.",
      );
    } finally {
      setIsLoading(null);
    }
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">Mesosphere Side Actions</p>
          <h1>Stripe checkout, powered by a server-side action.</h1>
          <p className="lead">
            Trigger Stripe Checkout from Mesosphere, log the session, and keep
            billing data off the client.
          </p>
        </div>
        <div className="status-card">
          <h2>Checkout Status</h2>
          {status === "success" && (
            <p className="success">Payment complete. Welcome aboard.</p>
          )}
          {status === "cancel" && (
            <p className="warning">Checkout canceled. Try again anytime.</p>
          )}
          {!status && (
            <p className="muted">Start a checkout to see status updates.</p>
          )}
        </div>
      </header>

      <section className="panel">
        <h2>Choose a plan</h2>
        <p className="muted">
          Enter an email to prefill Checkout. The payment happens on Stripe.
        </p>
        <div className="field">
          <label htmlFor="email">Customer email (optional)</label>
          <input
            id="email"
            type="email"
            value={email}
            placeholder="you@company.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="plans">
          {PLANS.map((plan) => (
            <article key={plan.id} className="plan-card">
              <div>
                <h3>{plan.name}</h3>
                <p className="price">{plan.price}</p>
                <p className="muted">{plan.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCheckout(plan.id)}
                disabled={isLoading === plan.id}
              >
                {isLoading === plan.id ? "Starting checkout..." : "Buy now"}
              </button>
            </article>
          ))}
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel">
        <h2>Recent checkout sessions</h2>
        <p className="muted">
          Each session is logged by the side action for internal tracking.
        </p>
        <div className="checkout-list">
          {checkouts?.length ? (
            checkouts.map((checkout: any) => (
              <div key={checkout._id} className="checkout-item">
                <div>
                  <h4>{checkout.plan || "plan"}</h4>
                  <p className="muted">Session: {checkout.sessionId}</p>
                </div>
                <div className="checkout-meta">
                  <span>
                    {formatCurrency(checkout.amount, checkout.currency)}
                  </span>
                  <span className="tag">{checkout.status || "open"}</span>
                  <span className="muted">
                    {new Date(checkout._creationTime).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No checkout sessions yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
