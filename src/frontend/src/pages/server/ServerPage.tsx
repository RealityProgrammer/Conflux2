import {Outlet, useLoaderData} from "react-router";
import {useEffect, useState} from "react";
import type {ChannelCategorySummaryDto, CommunityServerSummaryDto} from "../../api/responses.ts";
import {communityServerService} from "../../api/communityServerService.ts";
import Spinner from "../../components/Spinner.tsx";
import IconButton from "../../components/IconButton.tsx";
import {BsGear, BsGearFill} from "react-icons/bs";

type SummaryStatus = "loading" | "error" | CommunityServerSummaryDto;

export default function ServerPage() {
  const channelId: string | undefined = useLoaderData();
  const [channelSummary, setChannelSummary] = useState<SummaryStatus>("loading");

  useEffect(() => {
    const loadSummary = async (): Promise<void> => {
      if (!channelId) {
        setChannelSummary("error");
        return;
      }

      setChannelSummary("loading");
      const response = await communityServerService.getSummary(channelId);

      if (response.success) {
        setChannelSummary(response.data!);
      } else {
        setChannelSummary("error");
      }
    };

    loadSummary();
  }, [channelId]);

  switch (channelSummary) {
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
        <div className="size-full flex flex-row">
          <Sidebar name={channelSummary.name} channelCategories={channelSummary.channelCategories}/>

          <div className="flex-1 overflow-auto">

          </div>
        </div>
      );
  }
}

function Sidebar({name, channelCategories}: { name: string, channelCategories: ChannelCategorySummaryDto[] }) {
  return (
    <aside
      className="flex-none basis-72 h-full bg-gray-725 border-r-2 border-r-gray-600 text-white overflow-y-auto flex flex-col overflow-hidden"
    >
      <div>
        <header className="w-full aspect-video relative group">
          <section
            className="absolute font-bold block top-0 inset-x-0 bg-linear-to-b from-black/60 via-black/60 via-60% to-transparent pb-4 pt-1 px-1 -translate-y-full group-hover:translate-y-0 transition-transform duration-350 ease-in-out flex flex-row justify-center items-center"
          >
            <span className="flex-1">{name}</span>

            <IconButton isLoading={false} className="flex-none">
              <BsGearFill className="size-4 fill-white"/>
            </IconButton>
          </section>

          <div
            className="size-full bg-purple-600"
          />
        </header>

        <section className="mt-2 px-2">
          {channelCategories.filter(c => !c.id).map(c => {
            return (
              <>
                {c.channels.map(c => (
                  <button className="px-2 py-1.5 hover-highlight w-full rounded-md cursor-pointer text-left">
                    <span>{c.name}</span>
                  </button>
                ))}
              </>
            );
          })}
        </section>
      </div>
    </aside>
  );
}