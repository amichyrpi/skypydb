import { Route as RootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";

export const routeTree = RootRoute.addChildren([IndexRoute]);
