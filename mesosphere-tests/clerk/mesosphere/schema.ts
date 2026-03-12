import { SetTable, SetSchema } from "mesosphere/serverside";
import { type } from "mesosphere/type";

export default SetSchema({
  messages: SetTable({
    body: type.string(),
    author: type.string(),
  }),
});
