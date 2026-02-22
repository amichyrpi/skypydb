import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { build_functions_manifest, httpClient } from "skypydb";

dotenv.config();

async function main(): Promise<void> {
  const current_file = fileURLToPath(import.meta.url);
  const project_root = path.resolve(path.dirname(current_file), "..");
  process.chdir(project_root);

  const manifest = build_functions_manifest({
    cwd: project_root,
  });
  console.log("Built functions manifest:", manifest.output_path);

  const client = httpClient({
    api_url: process.env.SKYPYDB_API_URL,
    api_key: process.env.SKYPYDB_API_KEY,
  });

  await client.callmutation("schemas.applySchema", {});

  const user_id = String(
    await client.callmutation("users.createUser", {
      name: "Theo",
      email: "theo@example.com",
    }),
  );

  await client.callmutation("tasks.createTask", {
    title: "Write relational feature",
    userId: user_id,
  });

  await client.callmutation("tasks.createTask", {
    title: "Test query operators",
    userId: user_id,
  });

  const open_before = Number(
    await client.callquery("tasks.countOpenTasks", {
      userId: user_id,
    }),
  );
  console.log("Open tasks before complete:", open_before);

  const task_rows = (await client.callquery("tasks.listTasksByUser", {
    userId: user_id,
  })) as Array<Record<string, unknown>>;
  console.log("Tasks:", task_rows);

  const first_task = task_rows[0];
  if (first_task) {
    await client.callmutation("tasks.completeTask", {
      taskId: String(first_task._id),
    });
  }

  const open_after = Number(
    await client.callquery("tasks.countOpenTasks", {
      userId: user_id,
    }),
  );
  console.log("Open tasks after complete:", open_after);

  const user_rows = (await client.callquery("users.listUsers", {})) as Array<
    Record<string, unknown>
  >;
  console.log("Users:", user_rows);

  await client.close();
}

void main();