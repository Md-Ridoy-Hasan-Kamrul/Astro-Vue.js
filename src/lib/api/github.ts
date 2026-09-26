import { api } from './axios';
import { readTtlCache, writeTtlCache } from './ttlCache';

const ASTRO_REPO_CACHE_KEY = 'github:withastro/astro';
const API_CACHE_TTL_MS = 5 * 60_000;

export type RepoInfo = {
	full_name: string;
	description: string | null;
	stargazers_count: number;
	html_url: string;
	language: string | null;
};

/** GitHub API via Axios. Client: TanStack Query. Server: Astro server islands. */
export async function fetchRepo(
	owner: string,
	repo: string,
	signal?: AbortSignal,
): Promise<RepoInfo> {
	const { data } = await api.get<RepoInfo>(`/repos/${owner}/${repo}`, { signal });
	return data;
}

export async function fetchAstroRepo(signal?: AbortSignal): Promise<RepoInfo> {
	return fetchRepo('withastro', 'astro', signal);
}

/** 5-minute in-memory cache so server islands do not hit GitHub on every request. */
export async function fetchAstroRepoCached(signal?: AbortSignal): Promise<RepoInfo> {
	const hit = readTtlCache<RepoInfo>(ASTRO_REPO_CACHE_KEY);
	if (hit) {
		return hit;
	}

	const data = await fetchAstroRepo(signal);
	writeTtlCache(ASTRO_REPO_CACHE_KEY, data, API_CACHE_TTL_MS);
	return data;
}
