import {useQuery} from "@tanstack/react-query";
import {authService} from "../api/authService.ts";

export default function useSessionsQuery(
) {
  return useQuery({
    queryKey: ["SessionsQuery"],
    queryFn: async () => {
      const response = await authService.getSessions();
    },
  })
}