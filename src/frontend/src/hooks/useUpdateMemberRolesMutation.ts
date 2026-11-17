import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { serverService } from "../api/serverService.ts";

export interface UseUpdateMemberRolesMutationVariables {
  serverId: string;
  userId: string;
  addRoleIds: string[];
  removeRoleIds: string[];
}

export default function useUpdateMemberRolesMutation(
  options: Omit<
    UseMutationOptions<void, Error, UseUpdateMemberRolesMutationVariables>,
    "mutationKey" | "mutationFn"
  >,
) {
  return useMutation({
    mutationKey: useUpdateMemberRolesMutation.key,
    mutationFn: async (variables: UseUpdateMemberRolesMutationVariables) => {
      return await serverService.updateMemberRoles(
        variables.serverId,
        variables.userId,
        variables.addRoleIds,
        variables.removeRoleIds,
      );
    },
    ...options,
  });
}

useUpdateMemberRolesMutation.key = ["useUpdateMemberRolesMutation"];
