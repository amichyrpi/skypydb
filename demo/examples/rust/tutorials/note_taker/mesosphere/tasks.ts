import { readFunction, writeFunction } from "mesosphere/reactlibrarie";
import { type } from "mesosphere/type";

// Add a task to the database with a task name and a boolean to indicate if it succeed or not.
export const newtask = writeFunction({
  args: {
    task: type.string(),
    succeed: type.boolean(),
  },
  handler: async (mesosphere, args) => {
    await mesosphere.database.add("tasks", {
      task: args.task,
      succeed: args.succeed,
    });
  },
});

// Read all tasks from the database.
export const readtask = readFunction({
  args: {},
  handler: async (database) => {
    return await database.get("tasks");
  },
});
