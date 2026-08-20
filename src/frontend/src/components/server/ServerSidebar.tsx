import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {type KeyboardEvent, type Ref, useEffect, useReducer, useRef, useState} from "react";
import type {ChannelCategorySummaryDto, ChannelSummaryDto, ServiceResponse} from "../../api/responses.ts";
import {communityServerService} from "../../api/communityServerService.ts";
import {DropdownMenu} from "radix-ui";
import IconButton from "../IconButton.tsx";
import {BsExclamationTriangle, BsGearFill, BsHash, BsTrash, BsVolumeUp} from "react-icons/bs";
import {FaChevronRight, FaFolderPlus, FaHashtag, FaVolumeHigh} from "react-icons/fa6";
import Spinner from "../Spinner.tsx";
import AlertActionDialog from "../AlertActionDialog.tsx";

type CreateState = {
  idempotencyKey: string;
  type: "category" | "text" | "voice";
  targetCategoryId: string | null;
};

type DeletionState = {
  type: "category" | "channel";
  id: string;
}

type CreateStatus = CreateState & {
  id: string;
  status: "creating" | "error";
  name: string;
}

type ChannelAction =
  { type: "create_category", name: string } |
  { type: "create_channel", name: string } |
  { type: "delete_channel_category", id: string } |
  { type: "delete_channel", id: string };

export default function ServerSidebar() {
  const {serverId, serverSummary, appendChannel, appendChannelCategory} = useCommunityServerContext();

  const [createState, setCreateState] = useState<CreateState>();
  const [createStatus, setCreateStatus] = useState<CreateStatus[]>([]);

  const [deletionState, setDeletionState] = useState<DeletionState | undefined>();

  const nameTextInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nameTextInputRef.current) {
      setTimeout(() => {
        nameTextInputRef.current?.focus();
      }, 0);
    }
  }, [createState]);

  const handleChannelAction = async (action: ChannelAction) => {
    switch (action.type) {
      case "create_category": {
        if (!createState) return;

        const operationId = crypto.randomUUID();
        setCreateStatus(prev => [...prev, {
          id: operationId,
          status: "creating",
          name: action.name,
          type: "category",
          idempotencyKey: createState.idempotencyKey,
          targetCategoryId: null,
        }]);

        const response: ServiceResponse<string> = await communityServerService.createChannelCategory(
          createState.idempotencyKey,
          serverId,
          action.name
        );

        if (response.success) {
          setCreateStatus((prev) => [...prev.filter(s => s.id !== operationId)]);
          appendChannelCategory(response.data!, action.name);
        } else {
          setCreateStatus((prev) => prev.map(s => s.id === operationId ? {
            ...s,
            status: "error",
          } : s));
        }
        break;
      }

      case "create_channel": {
        if (!createState || (createState.type !== "text" && createState.type !== "voice")) return;

        const operationId = crypto.randomUUID();
        setCreateStatus(prev => [...prev, {
          id: operationId,
          status: "creating",
          name: action.name,
          type: createState.type,
          idempotencyKey: createState.idempotencyKey,
          targetCategoryId: createState.targetCategoryId,
        }]);

        const response = await communityServerService.createChannel(
          createState.idempotencyKey,
          serverId,
          action.name,
          createState.type,
          createState.targetCategoryId
        );

        if (response.success) {
          setCreateStatus((prev) => [...prev.filter(s => s.id !== operationId)]);
          appendChannel(response.data!, action.name, createState.type, createState.targetCategoryId);
        } else {
          setCreateStatus((prev) => prev.map(s => s.id === operationId ? {
            ...s,
            status: "error",
          } : s));
        }
        break;
      }

      case "delete_channel_category": {
        setDeletionState({type: "category", id: action.id});
        break;
      }

      case "delete_channel": {
        setDeletionState({type: "channel", id: action.id});
        break;
      }
    }
  };

  const handleCategoryDeletion = async (id: string) => {
    const response = await communityServerService.deleteChannelCategory(serverId, id);

    if (response.success) {
      // TODO: Implement
    }
  };

  const handleChannelDeletion = async (id: string) => {
    const response = await communityServerService.deleteChannel(serverId, id);

    if (response.success) {
      // TODO: Implement
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      const name = nameTextInputRef.current?.value.trim();

      if (name && createState) {
        switch (createState.type) {
          case "category":
            handleChannelAction({type: "create_category", name});
            break;

          case "text":
          case "voice":
            handleChannelAction({type: "create_channel", name});
        }
      }

      setCreateState(undefined);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setCreateState(undefined);
    }
  };

  return (
    <aside
      className="flex-none basis-64 h-full bg-gray-725 border-r-2 border-r-gray-600 text-white overflow-y-auto flex flex-col overflow-hidden scrollbar-hide"
    >
      <div>
        <Header setCreatingState={setCreateState}/>

        <section className="mt-2 px-1">
          {serverSummary.channelCategories.filter(c => !c.id).map(c => {
            return (
              <ChannelCategoryView
                key={c.id}
                category={c}
                createState={createState}
                createStatus={createStatus}
                inputRef={nameTextInputRef}
                onCreateKeyDown={handleKeyDown}
                setCreatingState={setCreateState}
                handleChannelAction={handleChannelAction}
              />
            );
          })}

          {serverSummary.channelCategories.filter(c => !!c.id).map(c => {
            return (
              <ChannelCategoryView
                key={c.id}
                category={c}
                createState={createState}
                createStatus={createStatus}
                inputRef={nameTextInputRef}
                onCreateKeyDown={handleKeyDown}
                setCreatingState={setCreateState}
                handleChannelAction={handleChannelAction}
              />
            );
          })}
        </section>
      </div>

      <AlertActionDialog
        panelClassName="w-128"
        open={!!deletionState}
        onOpenChange={(open) => {
          if (!open) {
            setDeletionState(undefined);
          }
        }}
        title={deletionState?.type === "channel" ? "Delete channel" : "Delete channel category"}
        description={"Are you sure you want to delete it? This action cannot be undone."}
        actionButton={(
          <button
            className="button-theme-danger cursor-pointer px-3 py-2 rounded-md"
            onClick={() => {
              if (!deletionState) return;

              switch (deletionState.type) {
                case "category":
                  handleCategoryDeletion(deletionState.id);
                  break;

                case "channel":
                  handleChannelDeletion(deletionState.id);
                  break;
              }
            }}>
            {deletionState?.type === "channel" ? "Delete channel" : "Delete category"}
          </button>
        )}
      />
    </aside>
  );
}

function Header({setCreatingState}: {setCreatingState: (state: CreateState) => void}) {
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);

  const { serverSummary: { name: serverName } } = useCommunityServerContext();

  return (
    <header className="w-full aspect-video relative group">
      <section
        className={`absolute font-bold top-0 inset-x-0 bg-linear-to-b from-black/60 via-black/60 via-60% to-transparent pb-4 pt-1 px-1 ${isOpenDropdown ? '' : '-translate-y-full group-hover:translate-y-0 transition-transform duration-350 ease-in-out'} flex flex-row justify-center items-center`}
      >
        <span className="flex-1 select-none truncate">{serverName}</span>

        <DropdownMenu.Root open={isOpenDropdown} onOpenChange={setIsOpenDropdown} modal={false}>
          <DropdownMenu.Trigger asChild>
            <IconButton isLoading={false} className="flex-none">
              <BsGearFill className="size-4 fill-white"/>
            </IconButton>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              sideOffset={5}
              className="w-64 rounded-md bg-gray-650 p-1.5 shadow-lg"
              onCloseAutoFocus={(e) => {
                e.preventDefault();
              }}
            >
              <DropdownMenu.Item className="dropdown-item-default mb-1" onSelect={() => {
                setCreatingState({ targetCategoryId: null, type: "category", idempotencyKey: crypto.randomUUID() });
              }}>
                Create channel category

                <FaFolderPlus className="fill-white size-4 ml-auto"/>
              </DropdownMenu.Item>

              <DropdownMenu.Item className="dropdown-item-default mb-1" onSelect={() => {
                setCreatingState({ targetCategoryId: null, type: "text", idempotencyKey: crypto.randomUUID() });
              }}>
                Create text channel

                <FaHashtag className="fill-white size-4 ml-auto"/>
              </DropdownMenu.Item>

              <DropdownMenu.Item className="dropdown-item-default" onSelect={() => {
                setCreatingState({ targetCategoryId: null, type: "voice", idempotencyKey: crypto.randomUUID() });
              }}>
                Create voice channel

                <FaVolumeHigh className="fill-white size-4 ml-auto"/>
              </DropdownMenu.Item>

              <DropdownMenu.Arrow className="fill-gray-650"/>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </section>

      <div
        className="size-full bg-purple-600"
      />
    </header>
  );
}

interface ChannelCategoryViewProps {
  category: ChannelCategorySummaryDto;
  createStatus: CreateStatus[];
  createState: CreateState | undefined;
  onCreateKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef: Ref<HTMLInputElement | null>;
  setCreatingState: (value: CreateState) => void;
  handleChannelAction: (action: ChannelAction) => void | Promise<void>;
}

function ChannelCategoryView({
  category,
  createStatus,
  createState,
  inputRef,
  onCreateKeyDown,
  setCreatingState,
  handleChannelAction,
}: ChannelCategoryViewProps) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);

  return (
    <>
      {category.id && (
        <div className="flex flex-row items-center gap-2 mb-1 group">
          <IconButton theme="default" onClick={() => setIsCategoryOpen(!isCategoryOpen)} className={`transition-transform duration-150 ease-in-out ${isCategoryOpen ? 'rotate-90' : 'rotate-0'}`}>
            <FaChevronRight className="size-3.5"/>
          </IconButton>

          <span className="text-gray-300 text-sm line-clamp-1 select-none flex-1">{category.name}</span>

          <div className={`h-5 items-center justify-center ${isOpenDropdown ? 'flex' : 'hidden group-hover:flex'}`}>
            <DropdownMenu.Root open={isOpenDropdown} onOpenChange={setIsOpenDropdown} modal={false}>
              <DropdownMenu.Trigger asChild>
                <IconButton theme="default">
                  <BsGearFill className="size-4 inline"/>
                </IconButton>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="bottom"
                  sideOffset={5}
                  className="w-64 rounded-md bg-gray-650 p-1.5 shadow-lg"
                  onCloseAutoFocus={(e) => {
                    e.preventDefault();
                  }}
                >
                  <DropdownMenu.Item className="dropdown-item-default mb-1" onSelect={() => {
                    setIsCategoryOpen(true);
                    setCreatingState({ targetCategoryId: category.id, type: "text", idempotencyKey: crypto.randomUUID() });
                  }}>
                    Create text channel

                    <FaHashtag className="fill-white size-4 ml-auto"/>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item className="dropdown-item-default mb-1" onSelect={() => {
                    setIsCategoryOpen(true);
                    setCreatingState({ targetCategoryId: category.id, type: "voice", idempotencyKey: crypto.randomUUID() });
                  }}>
                    Create voice channel

                    <FaVolumeHigh className="fill-white size-4 ml-auto"/>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item className="dropdown-item-danger" onSelect={() => {
                    if (category.id) {
                      handleChannelAction({
                        type: "delete_channel_category",
                        id: category.id,
                      });
                    }
                  }}>
                    Delete category

                    <BsTrash className="fill-red-500 size-4 ml-auto"/>
                  </DropdownMenu.Item>

                  <DropdownMenu.Arrow className="fill-gray-650"/>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      )}

      {isCategoryOpen && (
        <>
          {category.channels.map(c => <ChannelButton channel={c} handleChannelAction={handleChannelAction}/>)}

          {createStatus.filter(s => s.targetCategoryId === category.id).map(s => {
            return (
              <ChannelCreatingStatusView key={s.id} status={s}/>
            );
          })}
        </>
      )}

      {createState && createState.targetCategoryId === category.id && (
        <input
          ref={inputRef}
          type="text"
          className="input-field h-10 w-full mb-1"
          placeholder={`Enter ${createState.type === "category" ? "category" : "channel"} name`}
          maxLength={32}
          onKeyDown={onCreateKeyDown}
          autoFocus
        />
      )}
    </>
  );
}

function ChannelButton({
  channel,
  handleChannelAction
}: {channel: ChannelSummaryDto, handleChannelAction: (action: ChannelAction) => void | Promise<void>}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div
      key={channel.id}
      className="px-1 py-1 hover-highlight w-full rounded-md cursor-pointer text-left mb-1 flex flex-row items-center group"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {channel.channelType === "CommunityServerText" ? (
        <BsHash className="size-6 fill-gray-500 stroke-gray-500 inline mr-1" strokeWidth={0.75}/>
      ) : (
        <BsVolumeUp className="size-6 fill-gray-500 stroke-gray-500 inline mr-1"/>
      )}

      <span className="flex-1 truncate text-sm min-w-0">{channel.name}</span>

      <div className={`h-5 flex-none ${isDropdownOpen ? 'block' : 'hidden group-hover:block'}`}>
        <DropdownMenu.Root open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
          <DropdownMenu.Trigger asChild>
            <IconButton theme="default">
              <BsGearFill className="size-4 inline"/>
            </IconButton>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              sideOffset={5}
              className="w-64 rounded-md bg-gray-650 p-1.5 shadow-lg"
              onCloseAutoFocus={(e) => {
                e.preventDefault();
              }}
            >
              <DropdownMenu.Item className="dropdown-item-danger" onSelect={() => {
                handleChannelAction({
                  type: "delete_channel",
                  id: channel.id,
                })
              }}>
                Delete channel

                <BsTrash className="fill-red-500 size-4 ml-auto"/>
              </DropdownMenu.Item>

              <DropdownMenu.Arrow className="fill-gray-650"/>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}

function ChannelCreatingStatusView({status}: {status: CreateStatus}) {
  return (
    <p className="px-1 py-0.5 w-full mb-1 flex flex-row items-center justify-start" key={status.id}>
      {status.status === "creating" ? (
        <>
          <Spinner className="size-4 fill-white mr-2"/>

          <span className="line-clamp-1 text-gray-500 animate-pulse">{status.name}</span>
        </>
      ) : status.status === "error" ? (
        <>
          <BsExclamationTriangle className="size-4 fill-red-500 mr-2"/>

          <span className="line-clamp-1 text-red-400">{status.name}</span>
        </>
      ) : null}
    </p>
  );
}