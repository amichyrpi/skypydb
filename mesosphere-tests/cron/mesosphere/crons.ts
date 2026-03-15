import { Crons } from "mesosphere/serverside";
import { closefunction } from "../mesosphere/deploy";

const cron = Crons();

cron.interval(
  "clear-all-messages-in-the-chat",
  { minutes: 1 },
  closefunction.message.clearallmessages,
);

export default cron;
