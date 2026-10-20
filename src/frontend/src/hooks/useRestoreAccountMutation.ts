import {useMutation, type UseMutationOptions} from "@tanstack/react-query";
import type {RestoreAccountResponse, ServiceResponse} from "../api/types.ts";
import {authService} from "../api/authService.ts";

export function useRestoreAccountMutation(
  options?: Omit<UseMutationOptions<ServiceResponse<RestoreAccountResponse>, Error>, "mutationKey" | "mutationFn">,
) {
  return useMutation({
    mutationKey: ["RestoreAccount"],
    mutationFn: async (): Promise<ServiceResponse> => {
      return authService.restoreAccount();
    },
    ...options
  });
}