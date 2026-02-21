import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  callmutation,
  api as mutationApi,
} from "../../../../skypydb-js/src/mutation/callmutation.ts";
import {
  callquery,
  api as queryApi,
} from "../../../../skypydb-js/src/query/callquery.ts";
import { callschemas } from "../../../../skypydb-js/src/schemas/callschemas.ts";

async function main(): Promise<void> {
  const current_file = fileURLToPath(import.meta.url);
  const current_dir = path.dirname(current_file);

  // Ensure runtime loads the local demo/examples/js/relational_examples/skypydb folder.
  process.chdir(current_dir);

  // Optional config point for schema migration behavior.
  callschemas();

  const runCreateUser = callmutation(mutationApi.users.createUser);

  const user_id = String(
    await Promise.resolve(
      runCreateUser({
        name: "Theo",
        email: "theo@example.com",
      }),
    ),
  );

  await Promise.resolve(
    callmutation(mutationApi.tasks.createTask, {
      title: "Write relational feature",
      userId: user_id,
    }),
  );

  await Promise.resolve(
    callmutation(mutationApi.tasks.createTask, {
      title: "Test query operators",
      userId: user_id,
    }),
  );

  const open_before = await Promise.resolve(
    callquery(queryApi.tasks.countOpenTasks, { userId: user_id }),
  );
  console.log("Open tasks before complete:", open_before);

  const tasks = await Promise.resolve(
    callquery(queryApi.tasks.listTasksByUser, { userId: user_id }),
  );
  console.log("Tasks:", tasks);

  if (Array.isArray(tasks) && tasks.length > 0) {
    await Promise.resolve(
      callmutation(mutationApi.tasks.completeTask, {
        taskId: String(tasks[0]._id),
      }),
    );
  }

  const open_after = await Promise.resolve(
    callquery(queryApi.tasks.countOpenTasks, { userId: user_id }),
  );
  console.log("Open tasks after complete:", open_after);

  const users = await Promise.resolve(callquery(queryApi.users.listUsers));
  console.log("Users:", users);
}

void main();
