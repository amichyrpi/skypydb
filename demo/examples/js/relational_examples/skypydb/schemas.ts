import { defineSchema, defineTable } from "skypydb/schemas";
import { value } from "skypydb/values";

export default defineSchema({
  users: defineTable({
    name: value.string(),
    email: value.string()
  }).index("by_email", ["email"]),
  tasks: defineTable({
    title: value.string(),
    completed: value.boolean(),
    userId: value.id("users")
  }).index("by_user", ["userId"])
});

