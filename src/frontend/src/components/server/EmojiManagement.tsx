import Container from "../Container.tsx";
import { useState } from "react";
import { BsPlusLg, BsSearch, BsExclamationTriangle } from "react-icons/bs";
import { Virtuoso } from "react-virtuoso";
import {Avatar} from "../Avatar.tsx";
import useEmojisForManagementQuery from "../../hooks/useEmojisForManagementQuery.ts";
import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import type {EmojiManagementDto} from "../../api/types.ts";
import { useInterval } from "usehooks-ts";

export default function EmojiManagement() {
  const { detailsQueryResult: { data: serverDetails } } = useCommunityServerContext();

  const [searchQuery, setSearchQuery] = useState('');

  const { data, isError, isLoading } = useEmojisForManagementQuery(serverDetails!.id);

  // const filteredEmojis = emojis.filter((e) => e.shortCode.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <header className="flex-none mb-0">
        <h3 className="text-xl font-bold text-white">Emoji</h3>
        <p className="text-sm text-gray-400">
          Sprinkle some extra spice to your conversation with meme and animatable.
        </p>
      </header>

      <Container
        maxBreakpoint="3xl"
        containerClassName="min-h-0 flex-1"
        className="overflow-hidden h-full bg-black/10 border-2 border-gray-600 rounded-xl px-2 pt-3 flex flex-col"
      >
        <div className="flex-none flex flex-row items-center justify-between gap-2 pb-3 border-b border-gray-700/50">
          <div className="flex-1 relative w-full">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />

            <input
              type="text"
              placeholder="Search by shortcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 input-field pl-9 w-full"
            />
          </div>

          <p className="flex-none text-xs text-center font-medium text-gray-300 w-18 py-1 bg-black/20 rounded-md border border-gray-700">
            { isLoading || isError ? "???" : data!.length <= 50 ? data!.length : <span className="text-red-500">{data!.length}</span> } / 50
          </p>

          <button
            onClick={() => {
            }}
            className="flex-none button-theme-primary p-2 rounded-lg button-cursor flex flex-row justify-center items-center"
          >
            <BsPlusLg className="inline size-5"/>
          </button>
        </div>

        <div className="flex-1 min-h-0 py-2">
          {isLoading ? (
            <>
              {Array.from({ length: 20 }, (_, i) => (
                <SkeletonRow key={i}/>
              ))}
            </>
          ) : isError || !data ? (
            <div className="size-full flex flex-col justify-center items-center gap-1">
              <BsExclamationTriangle className="size-8 fill-white"/>
              <p className="select-none">Failed to load emojis.</p>
            </div>
          ) : (
            <Virtuoso
              className="size-full"
              data={data}
              itemContent={(_, emoji) => (
                <Row data={emoji}/>
              )}
            />
          )}
        </div>
      </Container>
    </>
  );
}

function SkeletonRow() {
  return (
    <div className="flex flex-row items-center justify-between py-2 px-3 my-1 rounded-lg">
      <div className="flex-1 flex flex-row items-center gap-3.5">
        <div className="flex-none rounded-lg animate-pulse bg-white/10 size-10"/>

        <div className="flex-1 space-y-1">
          <div className="h-5 w-1/2 animate-pulse bg-white/10 rounded-full"></div>
          <div className="h-4 w-1/2 animate-pulse bg-white/10 rounded-full"></div>
        </div>
      </div>

      <div className="flex-none h-4 w-1/5 animate-pulse bg-white/10 rounded-full"></div>
    </div>
  )
}

function Row({data}: {data: EmojiManagementDto}) {
  return (
    <div className="flex flex-row items-center justify-between py-2 px-3 my-1 rounded-lg hover-highlight group">
      <div className="flex-1 flex items-center gap-3.5">
        <div className="flex-none rounded-lg bg-gray-900/60 border border-gray-700/80 flex items-center justify-center overflow-hidden shrink-0">
          <img
            //src={emoji.imageUrl}
            alt={data.shortCode}
            className="size-10 object-contain"
          />
        </div>

        <div className="flex-1">
          <span className="text-sm text-white font-semibold">
            {data.shortCode}
          </span>

          <div className="text-xs text-gray-400 font-mono">
            ID: {data.id}
          </div>
        </div>
      </div>

      <div className="flex-none text-xs text-gray-400 flex flex-row items-center gap-1.5">
        <span>Added by</span>

        <Avatar.User
          userId={data.creator.userId}
          version={data.creator.avatarVersion ?? undefined}
          className="size-5 rounded-full"
        />

        <span className="text-gray-300 font-medium">
          {data.creator.displayName}
        </span>
      </div>
    </div>
  );
}