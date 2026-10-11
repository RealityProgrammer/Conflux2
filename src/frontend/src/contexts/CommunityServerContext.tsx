import type {
  ChannelCategoryIdentityDto,
  ServerChannelIdentityDto,
  ServerDetailsDto, ServerMemberAuthorizeInfoDto,
  ServiceError, ServiceResponse
} from "../api/types.ts";
import {createContext, type ReactNode, useContext} from "react";
import useServerConnection from "../hooks/useServerConnection.ts";
import {type QueryKey, useQuery, useQueryClient, type UseQueryResult} from "@tanstack/react-query";
import {communityServerService} from "../api/communityServerService.ts";
import useSignalREvent from "../hooks/useSignalREvent.ts";
import type {
  ServerChannelCategoryCreatedEvent,
  ServerChannelCategoryDeletedEvent,
  ServerChannelCreatedEvent, ServerChannelDeletedEvent
} from "../api/events.ts";
import {ServerPermission} from "../api/schema.ts";

interface CommunityServerContextType {
  detailsQueryResult: UseQueryResult<ServerDetailsDto, ServiceError>;

  appendChannelCategory: (category: ChannelCategoryIdentityDto) => void;
  removeChannelCategory: (id: string) => void;
  appendChannel: (channel: ServerChannelIdentityDto) => void;
  removeChannel: (id: string) => void;
  hasPermission: (permission: ServerPermission) => boolean;
  refreshPermission: () => Promise<void>;
  updatePermission: (value: Omit<Partial<ServerMemberAuthorizeInfoDto>, "memberId">) => void;
}

const CommunityServerContext = createContext<CommunityServerContextType | null>(null);

interface CommunityServerContextProviderProps {
  serverId: string | undefined;
  children: ReactNode;
}

export default function CommunityServerContextProvider({
  children,
  serverId,
}: CommunityServerContextProviderProps) {
  useServerConnection(serverId);
  
  const queryClient = useQueryClient();
  const detailsQueryKey: QueryKey = ["serverDetails", serverId];

  const detailsQueryResult = useQuery<unknown, ServiceError, ServerDetailsDto>({
    enabled: !!serverId,
    queryKey: detailsQueryKey,
    queryFn: async (): Promise<ServerDetailsDto> => {
      const response = await communityServerService.getDetails(serverId!);
      
      if (response.success) {
        return response.data!;
      }
      
      throw response.error;
    },
    staleTime: 15 * 60 * 1000,
    retry: (failureCount, error: ServiceError) => {
      if (error.code === "NETWORK_ERROR" || error.code === "REQUEST_SETUP_ERROR") {
        return failureCount <= 3;
      }
      
      return false;
    },
  });

  const updateServerDetails = (updater: (value: ServerDetailsDto) => Partial<ServerDetailsDto>) => {
    queryClient.setQueryData<ServerDetailsDto>(detailsQueryKey, (oldData) => {
      if (!oldData) return oldData;

      return {...oldData, ...updater(oldData)};
    });
  };

  const appendChannelCategory = (category: ChannelCategoryIdentityDto) => {
    updateServerDetails((oldData) => {
      return {
        channelCategories: [
          ...oldData.channelCategories,
          {
            id: category.id,
            name: category.name,
            channels: [],
          },
        ]
      }
    });
  };

  const removeChannelCategory = (id: string) => {
    updateServerDetails((oldData) => {
      const removingCategory = oldData.channelCategories.find(c => c.id === id);
      
      if (!removingCategory) {
        return {};
      }

      let updatedChannelCategories = oldData.channelCategories.filter(c => c.id !== id);
      const nullCategoryExists = updatedChannelCategories.some((c) => c.id == null);
      
      // if there is a category with null id, append the channels to it, else create a category with null id
      if (nullCategoryExists) {
        updatedChannelCategories = updatedChannelCategories.map((c) => {
          if (c.id == null) {
            return {
              ...c,
              channels: [...c.channels, ...removingCategory.channels],
            };
          }
          return c;
        });
      } else {
        updatedChannelCategories.push({
          id: null,
          name: null,
          channels: removingCategory.channels,
        });
      }
      
      return {
        ...oldData,
        channelCategories: updatedChannelCategories,
      };
    });
  };
  
  const appendChannel = (channel: ServerChannelIdentityDto) => {
    updateServerDetails((oldData) => {
      return {
        channelCategories: oldData.channelCategories.map(category => {
          if (category.id !== channel.categoryId) return category;
          
          return {
            ...category,
            channels: [
              ...category.channels,
              channel,
            ]
          }
        }),
      };
    });
  };

  const removeChannel = (id: string) => {
    updateServerDetails((oldData) => {
      return {
        channelCategories: oldData.channelCategories.map(category => {
          const channelIndex = category.channels.findIndex((c) => c.id === id);

          if (channelIndex === -1) {
            return category;
          }

          const updatedChannels = [
            ...category.channels.slice(0, channelIndex),
            ...category.channels.slice(channelIndex + 1)
          ];

          return {
            ...category,
            channels: updatedChannels,
          }
        }),
      };
    });
  };
  
  const hasPermission = (permission: ServerPermission): boolean => {
    if (!detailsQueryResult.isSuccess || !detailsQueryResult.data) return false;
    
    return detailsQueryResult.data.authorizeInfo.effectivePermissions.includes(permission);
  };
  
  const refreshPermission = async () => {
    if (!detailsQueryResult.isSuccess || !detailsQueryResult.data) return;
    
    const response: ServiceResponse<ServerMemberAuthorizeInfoDto> = 
      await communityServerService.getMemberAuthorizeInfo(detailsQueryResult.data.id);
    
    if (response.success && response.data) {
      queryClient.setQueryData<ServerDetailsDto>(detailsQueryKey, (oldData) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          authorizeInfo: response.data!,
        };
      });
    }
  };
  
  const updatePermission = (value: Omit<Partial<ServerMemberAuthorizeInfoDto>, "memberId">) => {
    if (!detailsQueryResult.isSuccess || !detailsQueryResult.data) return;

    queryClient.setQueryData<ServerDetailsDto>(detailsQueryKey, (oldData) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        authorizeInfo: {
          ...oldData.authorizeInfo,
          ...value,
        }
      };
    });
  };

  useSignalREvent("ServerChannelCategoryCreated", (event: ServerChannelCategoryCreatedEvent) => {
    if (event.serverId !== serverId) {
      return;
    }

    appendChannelCategory(event.categoryIdentity);
  });

  useSignalREvent("ServerChannelCategoryDeleted", (event: ServerChannelCategoryDeletedEvent) => {
    if (event.serverId !== serverId) {
      return;
    }

    removeChannelCategory(event.categoryId);
  });

  useSignalREvent("ServerChannelCreated", async (event: ServerChannelCreatedEvent) => {
    if (event.serverId !== serverId) {
      return;
    }
    
    const response = await communityServerService.getChannelCategories(event.serverId);
    
    if (response.success && response.data) {
      updateServerDetails(() => {
        return {
          channelCategories: response.data! ?? undefined,
        }
      });
    }
  });

  useSignalREvent("ServerChannelDeleted", (event: ServerChannelDeletedEvent) => {
    if (event.serverId !== serverId) {
      return;
    }

    removeChannel(event.channelId);
  });

  return (
    <CommunityServerContext.Provider value={{
      detailsQueryResult,
      appendChannelCategory,
      removeChannelCategory,
      appendChannel,
      removeChannel,
      hasPermission,
      refreshPermission,
      updatePermission
    }}>
      {children}
    </CommunityServerContext.Provider>
  );
}

export function useCommunityServerContext(): CommunityServerContextType {
  const context = useContext(CommunityServerContext);
  if (!context) throw new Error("useChatContainerContext must be used within an CommunityServerContextProvider.");

  return context;
}