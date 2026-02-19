import { defineSchema, defineTable } from "skypydb/schemas";
import { value } from "skypydb/values";

export default defineSchema({
  messages: defineTable({
    body: value.string(),
    user: value.id("users"),
  }),
  users: defineTable({
    name: value.string(),
    tokenIdentifier: value.string(),
  }).index("by_token", ["tokenIdentifier"]),
  documents: defineTable({
    id: value.id("documents"),
    string: value.string(),
    number: value.number(),
    boolean: value.boolean(),
    nestedObject: value.object({
      property: value.string(),
    }),
  })
});