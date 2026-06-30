import { queryOptions } from "@tanstack/react-query";
import {
  getStories,
  getStory,
  getFacets,
  getElders,
  getElder,
  getCollections,
  getCollection,
  searchStories,
} from "./catalog.functions";

export const storiesQuery = queryOptions({
  queryKey: ["stories"],
  queryFn: () => getStories(),
  staleTime: 60_000,
});

export const facetsQuery = queryOptions({
  queryKey: ["facets"],
  queryFn: () => getFacets(),
  staleTime: 5 * 60_000,
});

export const eldersQuery = queryOptions({
  queryKey: ["elders"],
  queryFn: () => getElders(),
  staleTime: 60_000,
});

export const collectionsQuery = queryOptions({
  queryKey: ["collections"],
  queryFn: () => getCollections(),
  staleTime: 60_000,
});

export const storyQuery = (slug: string) =>
  queryOptions({
    queryKey: ["story", slug],
    queryFn: () => getStory({ data: { slug } }),
    staleTime: 60_000,
  });

export const elderQuery = (slug: string) =>
  queryOptions({
    queryKey: ["elder", slug],
    queryFn: () => getElder({ data: { slug } }),
    staleTime: 60_000,
  });

export const collectionQuery = (slug: string) =>
  queryOptions({
    queryKey: ["collection", slug],
    queryFn: () => getCollection({ data: { slug } }),
    staleTime: 60_000,
  });

export const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ["search", q],
    queryFn: () => searchStories({ data: { q } }),
    staleTime: 30_000,
  });
