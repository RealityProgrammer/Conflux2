export const userService = {
  getAvatarUrl: (userId: string, forceRefresh?: boolean): string => {
    const queryParams: URLSearchParams = new URLSearchParams();

    if (forceRefresh) {
      queryParams.append("t", new Date().getTime().toString());
    }

    return `/api/users/${encodeURIComponent(userId)}/avatar?${queryParams.toString()}`;
  },
}