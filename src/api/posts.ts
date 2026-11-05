import { apiClient } from '../lib/apiClient';
import type { Post } from '../lib/fakeServer';

export interface PostsPage {
  items: Post[];
  nextPage: number | null;
}

export const postsApi = {
  /** One page of the feed. `pageParam` is the page number (1-based). */
  fetchPage: (pageParam: number): Promise<PostsPage> =>
    apiClient.get<PostsPage>(`/api/posts?page=${pageParam}&pageSize=5`),
};
