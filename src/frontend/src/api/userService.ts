export const userService = {
  getAvatarUrl: (userId: string, revision?: number): string => {
    const url = `/api/users/${encodeURIComponent(userId)}/avatar`;
    if (revision === undefined) return url;

    const queryParams: URLSearchParams = new URLSearchParams();
    queryParams.append("v", String(revision));

    return `${url}?${queryParams.toString()}`;
  },

  getBannerUrl: (userId: string, revision?: number): string => {
    const url = `/api/users/${encodeURIComponent(userId)}/banner`;
    if (revision === undefined) return url;

    const queryParams: URLSearchParams = new URLSearchParams();
    queryParams.append("v", String(revision));

    return `${url}?${queryParams.toString()}`;
  },
}