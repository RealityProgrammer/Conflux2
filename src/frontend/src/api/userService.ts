export const userService = {
  getAvatarUrl: (userId: string, version: number): string => {
    const url = `/api/users/${encodeURIComponent(userId)}/avatar`;
    
    const queryParams: URLSearchParams = new URLSearchParams();
    queryParams.append("v", String(version));

    return `${url}?${queryParams.toString()}`;
  },

  getBannerUrl: (userId: string, version: number): string => {
    const url = `/api/users/${encodeURIComponent(userId)}/banner`;
    
    const queryParams: URLSearchParams = new URLSearchParams();
    queryParams.append("v", String(version));

    return `${url}?${queryParams.toString()}`;
  },
}