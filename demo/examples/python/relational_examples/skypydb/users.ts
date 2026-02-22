import { mutationFunction, queryFunction, value } from "skypydb";

const USERS_TABLE = "example_users";

export const createUser = mutationFunction({
  args: {
    name: value.string(),
    email: value.string(),
  },
  steps: [
    {
      op: "insert",
      table: USERS_TABLE,
      value: {
        name: "$arg.name",
        email: "$arg.email",
      },
    },
  ],
});

export const listUsers = queryFunction({
  steps: [
    {
      op: "get",
      table: USERS_TABLE,
      orderBy: [{ field: "name", direction: "asc" }],
    },
  ],
});

export const getUserByEmail = queryFunction({
  args: {
    email: value.string(),
  },
  steps: [
    {
      op: "first",
      table: USERS_TABLE,
      where: {
        email: { $eq: "$arg.email" },
      },
    },
  ],
});