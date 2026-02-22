import { mutationFunction } from "skypydb";

export const schema_document = {
  tables: {
    example_users: {
      fields: {
        name: { type: "string" },
        email: { type: "string" },
      },
      indexes: [{ name: "by_email", columns: ["email"] }],
    },
    example_tasks: {
      fields: {
        title: { type: "string" },
        completed: { type: "boolean" },
        userId: { type: "id", table: "example_users" },
      },
      indexes: [{ name: "by_user", columns: ["userId"] }],
    },
  },
};

export const applySchema = mutationFunction({
  steps: [
    {
      op: "applySchema",
      schema: schema_document,
    },
  ],
});