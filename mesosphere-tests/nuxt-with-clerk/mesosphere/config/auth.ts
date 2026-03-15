import { Auth } from "mesosphere/serverside";

export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL,
      app: "mesosphere",
    },
  ],
} satisfies Auth;
