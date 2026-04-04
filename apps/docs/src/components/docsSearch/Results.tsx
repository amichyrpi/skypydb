import { DotsHorizontalIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import React, { useEffect, useState } from "react";
import ResultList from "./ResultList";
import { AlgoliaResult, Result } from "./types";

// Algolia search configuration
const ALGOLIA_APP_ID = "1KIE511890";
const ALGOLIA_API_KEY = "07096f4c927e372785f8453f177afb16";
const ALGOLIA_INDEX = "docs";
const ALGOLIA_SEARCH_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries`;

type AlgoliaSearchResponse = {
  results: Array<{
    hits: AlgoliaResult[];
  }>;
};

/** Send a search query to the Algolia API and return matching hits */
async function searchAlgolia(query: string, signal: AbortSignal) {
  const response = await fetch(ALGOLIA_SEARCH_URL, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      "X-Algolia-API-Key": ALGOLIA_API_KEY,
    },
    body: JSON.stringify({
      requests: [
        {
          indexName: ALGOLIA_INDEX,
          query,
          hitsPerPage: 15,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Algolia search failed: ${response.status}`);
  }

  const data = (await response.json()) as AlgoliaSearchResponse;
  return data.results[0]?.hits ?? [];
}

interface ResultsProps {
  query: string;
}

export default function Results({ query }: ResultsProps) {
  const [algoliaResults, setAlgoliaResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  // Deduplicate results by URL and filter out entries without a title
  const combinedResults = algoliaResults.reduce<Result[]>((acc, result) => {
    if (
      result.title
      && !acc.some((existingResult) => existingResult.url === result.url)
    ) {
      acc.push(result);
    }
    return acc;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (!query) {
      setAlgoliaResults([]);
      setLoading(false);
      return () => {
        controller.abort();
      };
    }

    setAlgoliaResults([]);
    setLoading(true);

    searchAlgolia(query, controller.signal)
      .then((hits) => {
        if (controller.signal.aborted) {
          return;
        }

        setAlgoliaResults(
          hits.map((hit) => ({
            title: hit.title === "" ? "Mesosphere Documentation" : hit.title,
            url: hit.objectID,
            snippet: hit.contents,
          })),
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Algolia search failed", error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [query]);

  return (
    <div
      className="overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-n7 [&::-webkit-scrollbar-thumb]:rounded-full"
      style={{
        scrollbarColor: "var(--color-neutral-n7) transparent",
      }}
    >
      {!loading && combinedResults.length === 0 && query && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <QuestionMarkCircledIcon className="w-8 h-8 text-neutral-n8" />
          <p className="text-sm text-neutral-n8 m-0">
            Nothing found for "
            <strong className="text-neutral-n10 dark:text-neutral-n6">
              {query}
            </strong>
            ".
          </p>
        </div>
      )}
      {combinedResults.length > 0 && <ResultList results={combinedResults} />}
      {loading && (
        <div className="flex justify-center items-center">
          <DotsHorizontalIcon className="w-8 h-8 text-neutral-n8 animate-pulse" />
        </div>
      )}
    </div>
  );
}
