import { httpClient, type SchemaDocument } from "skypydb";

const schema: SchemaDocument = {
  tables: {
    users: {
      fields: {
        name: { type: "string" },
        email: { type: "string" },
      },
      indexes: [{ name: "users_email_idx", columns: ["email"] }],
    },
    tasks: {
      fields: {
        title: { type: "string" },
        userId: { type: "id", table: "users" },
        isCompleted: { type: "boolean" },
      },
      indexes: [
        { name: "tasks_user_idx", columns: ["userId"] },
        { name: "tasks_status_idx", columns: ["isCompleted"] },
      ],
    },
  },
};

async function main(): Promise<void> {
  const client = httpClient({
    api_url: process.env.SKYPYDB_URL ?? "http://localhost:8000",
    api_key: process.env.SKYPYDB_API_KEY ?? "local-dev-key",
  });

  const users = client.relational("users");
  const tasks = client.relational("tasks");

  await client.schema.apply(schema);

  const user_id = await users.insert({
    name: "Theo",
    email: "theo@example.com",
  });

  await tasks.insert({
    title: "Write relational feature",
    userId: user_id,
    isCompleted: false,
  });

  await tasks.insert({
    title: "Test query operators",
    userId: user_id,
    isCompleted: false,
  });

  const open_before = await tasks.count({
    where: {
      $and: [{ userId: { $eq: user_id } }, { isCompleted: { $eq: false } }],
    },
  });
  console.log("Open tasks before complete:", open_before);

  const task_rows = (await tasks.query({
    where: { userId: { $eq: user_id } },
    orderBy: [{ field: "_createdAt", direction: "asc" }],
  })) as Array<Record<string, unknown>>;
  console.log("Tasks:", task_rows);

  const first_task = task_rows[0];
  if (first_task) {
    await tasks.update({
      id: String(first_task._id),
      value: {
        title: String(first_task.title),
        userId: String(first_task.userId),
        isCompleted: true,
      },
    });
  }

  const open_after = await tasks.count({
    where: {
      $and: [{ userId: { $eq: user_id } }, { isCompleted: { $eq: false } }],
    },
  });
  console.log("Open tasks after complete:", open_after);

  const user_rows = await users.query({
    orderBy: [{ field: "_createdAt", direction: "asc" }],
  });
  console.log("Users:", user_rows);
}

void main();
