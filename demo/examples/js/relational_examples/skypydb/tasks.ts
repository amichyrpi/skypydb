import { mutation } from "skypydb/mutation";
import { query } from "skypydb/query";
import { value } from "skypydb/values";

export const createTask = mutation({
  args: {
    title: value.string(),
    userId: value.id("users")
  },
  handler: (ctx, args) => {
    return ctx.db.insert("tasks", {
      title: args.title,
      completed: false,
      userId: args.userId
    });
  }
});

export const completeTask = mutation({
  args: {
    taskId: value.string()
  },
  handler: (ctx, args) => {
    const task = ctx.db.first("tasks", {
      where: { _id: { $eq: args.taskId } }
    });
    if (!task) {
      throw new Error(`Task '${args.taskId}' not found`);
    }

    return ctx.db.update("tasks", {
      id: args.taskId,
      value: {
        title: String(task.title),
        completed: true,
        userId: String(task.userId)
      }
    });
  }
});

export const listTasksByUser = query({
  args: {
    userId: value.id("users")
  },
  handler: (ctx, args) => {
    return ctx.db.get("tasks", {
      where: { userId: { $eq: args.userId } },
      orderBy: [{ field: "title", direction: "asc" }]
    });
  }
});

export const countOpenTasks = query({
  args: {
    userId: value.id("users")
  },
  handler: (ctx, args) => {
    return ctx.db.count("tasks", {
      where: {
        $and: [
          { userId: { $eq: args.userId } },
          { completed: { $eq: false } }
        ]
      }
    });
  }
});

