import { mutationFunction, queryFunction, value } from "skypydb";

const TASKS_TABLE = "example_tasks";

export const createTask = mutationFunction({
  args: {
    title: value.string(),
    userId: value.string(),
  },
  steps: [
    {
      op: "insert",
      table: TASKS_TABLE,
      value: {
        title: "$arg.title",
        completed: false,
        userId: "$arg.userId",
      },
    },
  ],
});

export const completeTask = mutationFunction({
  args: {
    taskId: value.string(),
  },
  steps: [
    {
      op: "first",
      table: TASKS_TABLE,
      where: {
        _id: { $eq: "$arg.taskId" },
      },
      into: "task",
    },
    {
      op: "assert",
      condition: "$var.task",
      message: "Task not found",
    },
    {
      op: "update",
      table: TASKS_TABLE,
      id: "$arg.taskId",
      value: {
        title: "$var.task.title",
        completed: true,
        userId: "$var.task.userId",
      },
    },
  ],
});

export const listTasksByUser = queryFunction({
  args: {
    userId: value.string(),
  },
  steps: [
    {
      op: "get",
      table: TASKS_TABLE,
      where: {
        userId: { $eq: "$arg.userId" },
      },
      orderBy: [{ field: "title", direction: "asc" }],
    },
  ],
});

export const countOpenTasks = queryFunction({
  args: {
    userId: value.string(),
  },
  steps: [
    {
      op: "count",
      table: TASKS_TABLE,
      where: {
        $and: [
          { userId: { $eq: "$arg.userId" } },
          { completed: { $eq: false } },
        ],
      },
    },
  ],
});