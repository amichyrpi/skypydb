import { callmutation, api } from "skypydb/callmutation";

export function MyApp() {
  const mutate = callmutation(api.myFunctions.mutate);
  const Callhandler = () => {
    mutate(); // can have arguments { a: 1, b: 2 }
  };
}

import { callquery, api } from "skypydb/callquery";

export function MyApp() {
  const data = callquery(api.myFunctions.sum, { a: 1, b: 2 });
  // do something with `data`
}

//schema auto create the table when your app is start and functions are called