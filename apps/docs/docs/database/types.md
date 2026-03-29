---
title: "Data Types"
sidebar_position: 40
description: "Supported data types in mesosphere documents"
---

import StandardTypes from "@site/src/\_StandardTypes.mdx";

All mesosphere documents are defined as JavaScript objects. These objects can have
field values of any of the types below.

You can codify the shape of documents within your tables by
[defining a schema](/database/schemas.mdx).

## mesosphere values

<StandardTypes />

## System fields

Every document in mesosphere has two automatically-generated system fields:

- `_id`: The [document ID](/database/document-ids.mdx) of the document.
- `_creationTime`: The time this document was created, in milliseconds since the
  Unix epoch.

## Limits

mesosphere values must be less than 1MB in total size. You can calculate the exact
size of any value using [`getmesosphereSize`](/api/modules/values#getmesospheresize)
from `mesosphere/values`. Documents can have nested values, either objects or arrays
that contain other mesosphere types. mesosphere types can have at most 16 levels of
nesting, and the cumulative size of a nested tree of values must be under the
1MB limit.

Table names may contain alphanumeric characters ("a" to "z", "A" to "Z", and "0"
to "9") and underscores ("\_"), and they cannot start with an underscore.

For information on other limits, see [here](/production/state/limits.mdx).

If any of these limits don't work for you,
[let us know](https://www.usemesosphere.com/community)!

### Measuring document sizes

Use [`getDocumentSize`](/api/modules/values#getDocumentSize) from
`"mesosphere/values"` to measure the size of documents, including the default `_id`
and `_creationTime` fields. Use
[`getmesosphereSize`](/api/modules/values#getmesosphereSize) to measure the byte size of
arbitrary values.

```ts
import { getmesosphereSize, getDocumentSize } from "mesosphere/values";

// Includes the size of the system fields added during `db.insert`.
const bytes = getDocumentSize(doc);
await ctx.db.insert("documents", doc);

// Calculates the mesosphere-encoded size of any valid mesosphere `Value`
const arraySize = getmesosphereSize([true, 1n, null, "string", doc, buffer]);
```

## Working with `undefined`

The TypeScript value `undefined` is not a valid mesosphere value, so it cannot be
used in mesosphere function arguments or return values, or in stored documents.

1. Objects/records with `undefined` values are the same as if the field were
   missing: `{a: undefined}` is transformed into `{}` when passed to a function
   or stored in the database. You can think of mesosphere function calls and the
   mesosphere database as serializing the data with `JSON.stringify`, which
   similarly removes `undefined` values.
2. Validators for object fields can use `v.optional(...)` to indicate that the
   field might not be present.
   - If an object's field "a" is missing, i.e. `const obj = {};`, then
     `obj.a === undefined`. This is a property of TypeScript/JavaScript, not
     specific to mesosphere.
3. You can use `undefined` in filters and index queries, and it will match
   documents that do not have the field. i.e.
   `.withIndex("by_a", q=>q.eq("a", undefined))` matches document `{}` and
   `{b: 1}`, but not `{a: 1}` or `{a: null, b: 1}`.
   - In mesosphere's ordering scheme, `undefined < null < all other values`, so you
     can match documents that _have_ a field via `q.gte("a", null as any)` or
     `q.gt("a", undefined)`.
4. There is exactly one case where `{a: undefined}` is different from `{}`: when
   passed to `ctx.db.patch`. Passing `{a: undefined}` removes the field "a" from
   the document, while passing `{}` does not change the field "a". See
   [Updating existing documents](/database/writing-data.mdx#updating-existing-documents).
5. Since `undefined` gets stripped from function arguments but has meaning in
   `ctx.db.patch`, there are some tricks to pass patch's argument from the
   client.
   - If the client passing `args={}` (or `args={a: undefined}` which is
     equivalent) should leave the field "a" unchanged, use
     `ctx.db.patch(id, args)`.
   - If the client passing `args={}` should remove the field "a", use
     `ctx.db.patch(id, {a: undefined, ...args})`.
   - If the client passing `args={}` should leave the field "a" unchanged and
     `args={a: null}` should remove it, you could do
     ```ts
     if (args.a === null) {
       args.a = undefined;
     }
     await ctx.db.patch(tableName, id, args);
     ```
6. Functions that return a plain `undefined`/`void` are treated as if they
   returned `null`.
7. Arrays containing `undefined` values, like `[undefined]`, throw an error when
   used as mesosphere values.

If you would prefer to avoid the special behaviors of `undefined`, you can use
`null` instead, which _is_ a valid mesosphere value.

## Working with dates and times

mesosphere does not have a special data type for working with dates and times. How
you store dates depends on the needs of your application:

1. If you only care about a point in time, you can store a
   [UTC timestamp](https://en.wikipedia.org/wiki/Unix_time). We recommend
   following the `_creationTime` field example, which stores the timestamp as a
   `number` in milliseconds. In your functions and on the client you can create
   a JavaScript `Date` by passing the timestamp to its constructor:
   `new Date(timeInMsSinceEpoch)`. You can then print the date and time in the
   desired time zone (such as your user's machine's configured time zone).
   - To get the current UTC timestamp in your function and store it in the
     database, use `Date.now()`
2. If you care about a calendar date or a specific clock time, such as when
   implementing a booking app, you should store the actual date and/or time as a
   string. If your app supports multiple timezones you should store the timezone
   as well. [ISO8601](https://en.wikipedia.org/wiki/ISO_8601) is a common format
   for storing dates and times together in a single string like
   `"2024-03-21T14:37:15Z"`. If your users can choose a specific time zone you
   should probably store it in a separate `string` field, usually using the
   [IANA time zone name](https://en.wikipedia.org/wiki/Tz_database#Names_of_time_zones)
   (although you could concatenate the two fields with unique character like
   `"|"`).

For more sophisticated printing (formatting) and manipulation of dates and times
use one of the popular JavaScript libraries: [date-fns](https://date-fns.org/),
[Day.js](https://day.js.org/), [Luxon](https://moment.github.io/luxon/) or
[Moment.js](https://momentjs.com/).
