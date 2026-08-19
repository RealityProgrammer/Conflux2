import {Outlet, useLoaderData} from "react-router";
import {useEffect, useState} from "react";
import {communityServerService} from "../api/communityServerService.ts";
import Spinner from "../components/Spinner.tsx";
import type {CommunityServerSummaryDto} from "../api/responses.ts";
import CommunityServerContextProvider from "../contexts/CommunityServerContext.tsx";

type SummaryStatus = "loading" | "error" | CommunityServerSummaryDto;

export default function ServerLayout() {
  const serverId: string | undefined = useLoaderData();
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
        <CommunityServerContextProvider serverId={serverId!} serverSummary={serverSummary}>
          <Outlet/>
        </CommunityServerContextProvider>
      );
  }
}