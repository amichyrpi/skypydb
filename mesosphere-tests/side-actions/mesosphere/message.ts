import { readFunction, sideaction } from "mesosphere/reactlibrary";
import { type } from "mesosphere/type";
import Stripe from "stripe";

const PLAN_CATALOG = {
  starter: {
    name: "Starter",
    amount: 1500,
    description: "Personal projects and prototypes.",
  },
  pro: {
    name: "Pro",
    amount: 4900,
    description: "Growing teams shipping production apps.",
  },
  team: {
    name: "Team",
    amount: 9900,
    description: "Scale up with advanced collaboration.",
  },
} as const;

const planType = type.union(
  type.literal("starter"),
  type.literal("pro"),
  type.literal("team"),
);

export const createCheckoutSession = sideaction({
  args: {
    plan: planType,
    successUrl: type.string(),
    cancelUrl: type.string(),
    customerEmail: type.optional(type.string()),
  },
  handler: async (mesosphere, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY.");
    }

    const plan = PLAN_CATALOG[args.plan as keyof typeof PLAN_CATALOG];
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: plan.amount,
            product_data: {
              name: plan.name,
              description: plan.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      customer_email: args.customerEmail || undefined,
      metadata: {
        plan: args.plan,
      },
    });

    if (!session.url) {
      throw new Error("Stripe checkout session missing URL");
    }

    await mesosphere.database.add("checkouts", {
      plan: args.plan,
      amount: plan.amount,
      currency: "usd",
      sessionId: session.id,
      sessionUrl: session.url,
      status: session.status ?? "open",
      customerEmail: args.customerEmail ?? null,
    });

    return { url: session.url, sessionId: session.id };
  },
});

export const readCheckouts = readFunction({
  args: {
    limit: type.optional(type.string()),
  },
  handler: async (mesosphere: any, args: any) => {
    const isauthenticated = await mesosphere.auth.getuserauthstatue();
    if (!isauthenticated) {
      throw new Error("Unauthenticated call to read function");
    }

    const limit = args.limit ?? "50";
    const checkouts = (await mesosphere.database
      .get("checkouts")
      .order("desc")
      .nresult(limit)
      .accumulate()) as Array<Record<string, unknown>>;

    // Redact sensitive fields by default.
    return checkouts.map(({ customerEmail: _customerEmail, ...rest }) => rest);
  },
});
