the user whant to use the relational database he create a skypydb/ folder in the root of his project and put the functions he whant to use in it.

when the user whant to use the function he created he can use the following syntax:

```typescript
export function MyApp() {
  const mutate = callmutation(api.myFunctions.mutate); // replace myFunctions with the name of the function you want to use
  const Callhandler = () => {
    mutate(); // can have arguments { a: 1, b: 2 }
  };
}

import { callquery, api } from "skypydb/callquery";

export function MyApp() {
  const data = callquery(api.myFunctions.sum, { a: 1, b: 2 }); // replace myFunctions with the name of the function you want to use
  // do something with `data`
}
```

the callquery and callmutation are used to call the functions in the skypydb/ folder.

the api object is used to access the functions in the skypydb/ folder.