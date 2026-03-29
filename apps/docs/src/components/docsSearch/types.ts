/** Raw hit shape returned by the Algolia search API */
export type AlgoliaResult = {
  title: string;
  objectID: string;
  contents: string;
};

/** Normalised search result used throughout the search UI */
export type Result = {
  title: string;
  url: string;
  subtext?: string;
};
