import {useMutation, type UseMutationOptions} from "@tanstack/react-query";
import type {ServiceResponse} from "../api/types.ts";
import {authService} from "../api/authService.ts";

export function useRestoreAccountMutation(
  options?: Omit<UseMutationOptions<ServiceResponse, Error>, "mutationKey" | "mutationFn">,
) {
  return useMutation({
    mutationKey: ["RestoreAccount"],
    mutationFn: async (): Promise<ServiceResponse> => {
      return authService.restoreAccount();
    },
    ...options
  });
}