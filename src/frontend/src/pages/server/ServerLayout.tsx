import {Outlet, useParams} from "react-router";
import {type Dispatch, type SetStateAction, useEffect, useState} from "react";
import {communityServerService} from "../../api/communityServerService.ts";
import Spinner from "../../components/Spinner.tsx";
import type {CommunityServerSummaryDto} from "../../api/responses.ts";
import CommunityServerContextProvider from "../../contexts/CommunityServerContext.tsx";
import ServerSidebar from "../../components/server/ServerSidebar.tsx";

type SummaryStatus = "loading" | "error" | CommunityServerSummaryDto;

export default function ServerLayout() {
  const { serverId } = useParams();
  const [serverSummary, setServerSummary] = useState<SummaryStatus>("loading");

  useEffect(() => {
    const loadSummary = async (): Promise<void> => {
      if (!serverId) {
        setServerSummary("error");
        return;
      }

      setServerSummary("loading");
      const response = await communityServerService.getSummary(serverId);

      if (response.success) {
        setServerSummary(response.data!);
      } else {
        setServerSummary("error");
      }
    };

    loadSummary();
  }, [serverId]);

  switch (serverSummary) {
    case "loading":
      return (
        <div className="size-full flex flex-row justify-center items-center">
          <Spinner className="size-8 fill-white"/>
        </div>
      );

    case "error":
      return (
        <div className="size-full flex flex-row justify-center items-center">
          <span className="text-white">Failed to load server information. Please try again later...</span>
        </div>
      );

    default:
      return (
        <SuccessfullyLoadedLayout
          serverId={serverId!}
          serverSummary={serverSummary}
          setServerSummary={setServerSummary}/>
      );
  }
}

function SuccessfullyLoadedLayout({
  serverId,
  serverSummary,
  setServerSummary,
}: {serverId: string, serverSummary: CommunityServerSummaryDto, setServerSummary: Dispatch<SetStateAction<SummaryStatus>>}) {
  const appendChannelCategory = (id: string, name: string) => {
    setServerSummary((prev) => {
      if (prev === "loading" || prev === "error") return prev;

      return {
        ...prev,
        channelCategories: [
          ...prev.channelCategories,
          {
            id,
            name,
            channels: [],
          },
        ],
      };
    });
  };

  const appendChannel = (
    id: string,
    name: string,
    type: "text" | "voice",
    categoryId: string | null
  ) => {
    setServerSummary((prev) => {
      if (prev === "loading" || prev === "error") return prev;

      // if there is no category, create a category with null id
      if (!prev.channelCategories || prev.channelCategories.length === 0) {
        return {
          ...prev,
          channelCategories: [
            {
              id: null,
              name: null,
              channels: [
                {
                  id,
                  name,
                  channelType: type === "text" ? "CommunityServerText" : "CommunityServerVoice",
                }
              ]
            }
          ]
        };
      }

      return {
        ...prev,
        channelCategories: prev.channelCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              channels: [
                ...category.channels,
                {
                  id,
                  name,
                  channelType: type === "text" ? "CommunityServerText" : "CommunityServerVoice",
                },
              ],
            };
          }

          return category;
        }),
      };
    });
  };

  const removeChannelCategory = (id: string) => {
    setServerSummary((prev) => {
      if (prev === "loading" || prev === "error") return prev;

      const removingCategory = prev.channelCategories.find(c => c.id === id);

      if (!removingCategory) {
        return prev;
      }

      let updatedChannelCategories = prev.channelCategories.filter(c => c.id !== id);
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
        ...prev,
        channelCategories: updatedChannelCategories,
      };
    });
  };

  const removeChannel = (id: string) => {
    setServerSummary((prev) => {
      if (prev === "loading" || prev === "error") return prev;

      return {
        ...prev,
        channelCategories: prev.channelCategories.map(category => {
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
      }
    });
  };

  return (
    <CommunityServerContextProvider
      serverId={serverId}
      serverSummary={serverSummary}
      appendChannelCategory={appendChannelCategory}
      appendChannel={appendChannel}
      removeChannelCategory={removeChannelCategory}
      removeChannel={removeChannel}
    >
      <div className="size-full flex flex-row">
        <ServerSidebar/>

        <div className="flex-1 overflow-auto flex flex-row justify-center items-center">
          <Outlet/>
        </div>
      </div>
    </CommunityServerContextProvider>
  );
}