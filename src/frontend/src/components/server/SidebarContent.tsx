import { AvatarAndBanner } from "../AvatarAndBanner.tsx";
import {
  BsChatText,
  BsDoorClosedFill,
  BsDoorOpenFill,
  BsExclamationCircle,
  BsFolder,
  BsFolderX,
  BsGearFill,
  BsPersonPlusFill,
  BsTrashFill,
  BsVolumeUp,
} from "react-icons/bs";
import { DropdownMenu, Separator, Tooltip } from "radix-ui";
import { useCommunityServerContext } from "../../contexts/CommunityServerContext.tsx";
import { serverService } from "../../api/serverService.ts";
import AvatarFallback from "./AvatarFallback.tsx";
import type { ServerChannelIdentityDto, ServiceResponse } from "../../api/types.ts";
import { useState } from "react";
import { FaChevronRight } from "react-icons/fa6";
import IconButton from "../IconButton.tsx";
import { useNavigate } from "react-router";
import { ChannelType, ServerPermission } from "../../api/schema.ts";
import CreateCategoryOrChannelModal, { type CreateType } from "./CreateCategoryOrChannelModal.tsx";
import AlertDialog from "../AlertActionDialog.tsx";
import { useChannelDeleteMutation } from "../../hooks/useChannelDeleteMutation.ts";
import { toast } from "react-toastify";
import { useChannelCategoryDeleteMutation } from "../../hooks/useChannelCategoryDeleteMutation.ts";
import CreateInvitationDialog from "./CreateInvitationDialog.tsx";
import { ServerManagementModal } from "./ServerManagementModal.tsx";
import { useMentionCountStore } from "../../store/useMentionCountStore.ts";
import useLeaveServerMutation from "../../hooks/useLeaveServerMutation.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useInfiniteGetJoinedCommunityServerQuery } from "../../graphql/infiniteQueries.ts";

type CreateModalState = {
  categoryId: string | null;
  type: CreateType;
};

type CategoryOrChannelDeleteState = {
  type: "category" | "channel";
  id: string;
};

export default function SidebarContent() {
  const {
    detailsQueryResult: { data: serverDetails, isLoading, isError, isSuccess },
  } = useCommunityServerContext();

  const [createModalState, setCreateModalState] = useState<CreateModalState | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<CategoryOrChannelDeleteState | null>(null);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);

  return (
    <>
      {isLoading ? (
        <>
          <AvatarAndBanner.Skeleton avatarClassName="border-4 border-gray-725 overflow-hidden rounded-full" />

          <div className="mx-2 h-6 w-2/3 animate-pulse rounded-full bg-white/10" />
        </>
      ) : isError || !serverDetails ? (
        <>
          <AvatarAndBanner.Error />

          <div className="flex flex-row items-center justify-start gap-2 px-2">
            <p className="flex-none truncate">Unknown Land</p>

            <Tooltip.Root>
              <Tooltip.Trigger>
                <BsExclamationCircle className="size-3 fill-gray-300" />
              </Tooltip.Trigger>

              <Tooltip.Portal>
                <Tooltip.Content
                  className="max-w-96 rounded-lg bg-gray-500 px-3 py-2.5 text-white shadow-xl select-none"
                  sideOffset={5}
                  side="top"
                >
                  You might have slipped through the fabric of reality and ended up here. Trace back to
                  where you were and try again...
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        </>
      ) : (
        <SuccessfulHeader
          setCreateModalState={setCreateModalState}
          setIsInvitationModalOpen={setIsInvitationModalOpen}
          setIsManagementModalOpen={setIsManagementModalOpen}
        />
      )}

      <Separator.Root orientation="horizontal" decorative className="horizontal-separator mx-1 my-2" />

      {isSuccess && (
        <SuccessfulBody
          createModalState={createModalState}
          setCreateModalState={setCreateModalState}
          deleteModalState={deleteModalState}
          setDeleteModalState={setDeleteModalState}
          isInvitationModalOpen={isInvitationModalOpen}
          setIsInvitationModalOpen={setIsInvitationModalOpen}
          isManagementModalOpen={isManagementModalOpen}
          setIsManagementModalOpen={setIsManagementModalOpen}
        />
      )}
    </>
  );
}

interface SuccessfulHeaderProps {
  setCreateModalState: (value: CreateModalState) => void;
  setIsInvitationModalOpen: (value: boolean) => void;
  setIsManagementModalOpen: (value: boolean) => void;
}

function SuccessfulHeader({
  setCreateModalState,
  setIsInvitationModalOpen,
  setIsManagementModalOpen,
}: SuccessfulHeaderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    detailsQueryResult: { data: serverDetails, isSuccess: isDetailsSuccess },
    hasPermission,
    isOwner,
  } = useCommunityServerContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLeaveServerModalOpen, setIsLeaveServerModalOpen] = useState(false);

  const leaveServerMutation = useLeaveServerMutation();

  if (!serverDetails) return null;

  const canCreateChannel = hasPermission(ServerPermission.CreateChannel);
  const canCreateInvitation = hasPermission(ServerPermission.CreateInvitation);
  const canAccessServerManagementDialog =
    hasPermission(ServerPermission.CreateRole) ||
    hasPermission(ServerPermission.UpdateRole) ||
    hasPermission(ServerPermission.DeleteRole) ||
    hasPermission(ServerPermission.UpdateMemberRoles) ||
    hasPermission(ServerPermission.ManageMembers) ||
    hasPermission(ServerPermission.KickMembers) ||
    hasPermission(ServerPermission.WarnMembers) ||
    hasPermission(ServerPermission.BanMembers) ||
    hasPermission(ServerPermission.UnbanMembers);

  const canLeaveServer = !isOwner;

  return (
    <div className="relative">
      <AvatarAndBanner.Template
        banner={{
          src: undefined,
          alt: "Server Banner",
          fallback: <div className="size-full bg-violet-500"></div>,
        }}
        avatar={{
          src: serverDetails.avatarVersion
            ? serverService.getAvatarUrl(serverDetails.id, serverDetails.avatarVersion)
            : undefined,
          alt: "Server Avatar",
          fallback: <AvatarFallback />,
          rootClassName: "border-4 border-gray-725",
        }}
      />

      <p className="flex-none truncate px-2">{serverDetails.name}</p>

      {isDetailsSuccess && (
        <DropdownMenu.Root open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
          <DropdownMenu.Trigger asChild>
            <IconButton theme="default" className="absolute top-1 right-1">
              <BsGearFill className="size-5" />
            </IconButton>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              sideOffset={5}
              className="bg-gray-650 w-64 rounded-md p-1.5 shadow-lg"
              onCloseAutoFocus={(e) => {
                e.preventDefault();
              }}
            >
              {canCreateChannel && (
                <>
                  <DropdownMenu.Item
                    className="dropdown-item-default"
                    onSelect={() =>
                      setCreateModalState({
                        categoryId: null,
                        type: "category",
                      })
                    }
                  >
                    Create category
                    <BsFolder className="ml-auto size-4 fill-white" />
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    className="dropdown-item-default"
                    onSelect={() => setCreateModalState({ categoryId: null, type: "text" })}
                  >
                    Create text channel
                    <BsChatText className="ml-auto size-4 fill-white" />
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    className="dropdown-item-default"
                    onSelect={() => setCreateModalState({ categoryId: null, type: "voice" })}
                  >
                    Create voice channel
                    <BsVolumeUp className="ml-auto size-4 fill-white" />
                  </DropdownMenu.Item>
                </>
              )}

              {canCreateInvitation && (
                <>
                  <DropdownMenu.Item
                    className="dropdown-item-default"
                    onSelect={() => setIsInvitationModalOpen(true)}
                  >
                    Create invitation
                    <BsPersonPlusFill className="ml-auto size-4 fill-white" />
                  </DropdownMenu.Item>

                  <Separator.Root
                    className="horizontal-separator my-1"
                    decorative
                    orientation="horizontal"
                  />
                </>
              )}

              {canAccessServerManagementDialog && (
                <>
                  <DropdownMenu.Item
                    className="dropdown-item-default"
                    onSelect={() => setIsManagementModalOpen(true)}
                  >
                    Manage Server
                    <BsGearFill className="ml-auto size-4 fill-white" />
                  </DropdownMenu.Item>

                  {canLeaveServer && (
                    <Separator.Root
                      className="horizontal-separator my-1"
                      decorative
                      orientation="horizontal"
                    />
                  )}
                </>
              )}

              {canLeaveServer && (
                <DropdownMenu.Item
                  className="dropdown-item-danger"
                  onSelect={() => setIsLeaveServerModalOpen(true)}
                >
                  Leave Server
                  <BsDoorOpenFill className="ml-auto size-4" />
                </DropdownMenu.Item>
              )}

              <DropdownMenu.Arrow className="fill-gray-650" />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}

      <AlertDialog
        open={isLeaveServerModalOpen}
        onOpenChange={setIsLeaveServerModalOpen}
        title="Leave Server"
        subtitle="Well fun time is over, it is time to depart..."
        headerIcon={<BsDoorClosedFill className="size-10 fill-white" />}
        contentClassName="centered-dialog w-128 text-white bg-gray-650 outline-none"
        cancelButton={
          <button type="button" className="button-cursor px-3 py-2">
            Cancel
          </button>
        }
        actionButton={
          <button
            type="button"
            className="button-theme-danger button-cursor rounded-md px-3 py-2"
            onClick={() => {
              leaveServerMutation.mutate(
                { serverId: serverDetails?.id },
                {
                  onSuccess: () => {
                    queryClient.invalidateQueries({
                      queryKey: useInfiniteGetJoinedCommunityServerQuery.getKey({}),
                    });

                    navigate("/lobby");
                  },
                  onError: () => {
                    toast.error("Failed to leave server.");
                  },
                },
              );
              setIsLeaveServerModalOpen(false);
            }}
          >
            Leave Server
          </button>
        }
      >
        <div className="p-3">Are you sure you want to leave? Your friends will miss you...</div>
      </AlertDialog>
    </div>
  );
}

interface SuccessfulBodyProps {
  createModalState: CreateModalState | null;
  setCreateModalState: (value: CreateModalState | null) => void;
  deleteModalState: CategoryOrChannelDeleteState | null;
  setDeleteModalState: (value: CategoryOrChannelDeleteState | null) => void;
  isInvitationModalOpen: boolean;
  setIsInvitationModalOpen: (value: boolean) => void;
  isManagementModalOpen: boolean;
  setIsManagementModalOpen: (value: boolean) => void;
}

function SuccessfulBody({
  createModalState,
  setCreateModalState,
  deleteModalState,
  setDeleteModalState,
  isInvitationModalOpen,
  setIsInvitationModalOpen,
  isManagementModalOpen,
  setIsManagementModalOpen,
}: SuccessfulBodyProps) {
  const {
    detailsQueryResult: { data: serverDetails },
  } = useCommunityServerContext();

  const deleteChannelMutation = useChannelDeleteMutation();
  const deleteChannelCategoryMutation = useChannelCategoryDeleteMutation();

  if (!serverDetails) return null;

  return (
    <>
      <div className="px-2">
        <CategoryList setCreateModalState={setCreateModalState} setDeleteModalState={setDeleteModalState} />
      </div>

      <CreateCategoryOrChannelModal
        open={!!createModalState}
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalState(null);
          }
        }}
        categoryId={createModalState?.categoryId ?? null}
        initialType={createModalState?.type}
      />

      <ServerManagementModal open={isManagementModalOpen} onOpenChanged={setIsManagementModalOpen} />

      <CreateInvitationDialog open={isInvitationModalOpen} onOpenChange={setIsInvitationModalOpen} />

      <AlertDialog
        contentClassName="centered-dialog w-lg bg-gray-650 text-white"
        open={!!deleteModalState}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteModalState(null);
          }
        }}
        title={deleteModalState?.type === "channel" ? "Delete channel" : "Delete channel category"}
        subtitle="Time to forget the history..."
        headerIcon={
          deleteModalState?.type === "channel" ? (
            <BsTrashFill className="size-10 fill-white" />
          ) : (
            <BsFolderX className="size-10 fill-white" />
          )
        }
        cancelButton={
          <button type="button" className="basis-20 cursor-pointer outline-none">
            Cancel
          </button>
        }
        actionButton={
          <button
            className="button-theme-danger cursor-pointer rounded-md px-3 py-2"
            onClick={async () => {
              if (!deleteModalState) return;

              switch (deleteModalState.type) {
                case "category": {
                  deleteChannelCategoryMutation.mutate(
                    {
                      serverId: serverDetails.id,
                      categoryId: deleteModalState.id,
                    },
                    {
                      onSuccess: (data: ServiceResponse) => {
                        if (!data.success) {
                          toast.error("Failed to delete channel category.");
                        }
                      },
                    },
                  );
                  break;
                }

                case "channel": {
                  deleteChannelMutation.mutate(
                    {
                      serverId: serverDetails.id,
                      channelId: deleteModalState.id,
                    },
                    {
                      onSuccess: (data: ServiceResponse) => {
                        if (!data.success) {
                          toast.error("Failed to delete channel.");
                        }
                      },
                    },
                  );
                  break;
                }
              }
            }}
          >
            Delete {deleteModalState?.type}
          </button>
        }
      >
        <div className="p-3">
          {deleteModalState?.type === "category" ? (
            <>
              <p>Are you sure you want to delete this channel category? This action cannot be undone.</p>
              <p>The inner channels will be uncategorized.</p>
            </>
          ) : (
            <p>Are you sure you want to delete this channel? This action cannot be undone.</p>
          )}
        </div>
      </AlertDialog>
    </>
  );
}

interface CategoryListProps {
  setCreateModalState: (value: CreateModalState) => void;
  setDeleteModalState: (value: CategoryOrChannelDeleteState) => void;
}

function CategoryList({ setCreateModalState, setDeleteModalState }: CategoryListProps) {
  const {
    detailsQueryResult: { data: serverDetails },
  } = useCommunityServerContext();
  const channelCategories = serverDetails?.channelCategories;

  if (!channelCategories) return null;

  return (
    <>
      {channelCategories.map((category) => {
        return category.id ? (
          <ChannelCategory
            key={category.id}
            id={category.id}
            name={category.name ?? "???"}
            channels={category.channels}
            setCreateModalState={setCreateModalState}
            setDeleteModalState={setDeleteModalState}
          />
        ) : (
          <div key="uncategorized" className="space-y-1">
            {category.channels.map((channel) => (
              <ChannelButton
                key={channel.id}
                id={channel.id}
                name={channel.name}
                type={channel.channelType}
                setDeleteModalState={setDeleteModalState}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

interface ChannelCategoryProps {
  id: string;
  name: string;
  channels: ServerChannelIdentityDto[];
  setCreateModalState: (value: CreateModalState) => void;
  setDeleteModalState: (value: CategoryOrChannelDeleteState) => void;
}

function ChannelCategory({
  id,
  name,
  channels,
  setCreateModalState,
  setDeleteModalState,
}: ChannelCategoryProps) {
  const { hasPermission } = useCommunityServerContext();

  const [isOpen, setIsOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <>
      <div
        className="hover-highlight group mb-1 flex w-full cursor-pointer flex-row items-center gap-2 rounded-md px-1 py-1.5 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FaChevronRight
          className={`size-4 transition-transform duration-150 ease-in-out ${isOpen ? "rotate-90" : "rotate-0"}`}
        />

        <span className="min-w-0 flex-1 truncate text-sm">{name}</span>

        {hasPermission(ServerPermission.DeleteChannel) && (
          <div
            className={`h-5 flex-none ${isDropdownOpen ? "block" : "hidden group-hover:block"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu.Root open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
              <DropdownMenu.Trigger asChild>
                <IconButton theme="default">
                  <BsGearFill className="size-4" />
                </IconButton>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="bottom"
                  sideOffset={5}
                  className="bg-gray-650 w-64 rounded-md p-1.5 shadow-lg"
                  onCloseAutoFocus={(e) => {
                    e.preventDefault();
                  }}
                >
                  <DropdownMenu.Item
                    className="dropdown-item-default"
                    onSelect={() => setCreateModalState({ categoryId: id, type: "text" })}
                  >
                    Create text channel
                    <BsChatText className="ml-auto size-4 fill-white" />
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    className="dropdown-item-default"
                    onSelect={() => setCreateModalState({ categoryId: id, type: "voice" })}
                  >
                    Create voice channel
                    <BsVolumeUp className="ml-auto size-4 fill-white" />
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    className="dropdown-item-danger"
                    onSelect={() => setDeleteModalState({ type: "category", id })}
                  >
                    Delete category
                    <BsTrashFill className="ml-auto size-4 fill-red-500" />
                  </DropdownMenu.Item>

                  <DropdownMenu.Arrow className="fill-gray-650" />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        )}
      </div>

      {isOpen && channels.length > 0 && (
        <div className="space-y-1">
          {channels.map((channel) => (
            <ChannelButton
              key={channel.id}
              id={channel.id}
              name={channel.name}
              type={channel.channelType}
              setDeleteModalState={setDeleteModalState}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface ChannelButtonProps {
  id: string;
  name: string;
  type: ChannelType;
  setDeleteModalState: (value: CategoryOrChannelDeleteState) => void;
}

function ChannelButton({ id, name, type, setDeleteModalState }: ChannelButtonProps) {
  const {
    detailsQueryResult: { data: serverDetails },
    hasPermission,
  } = useCommunityServerContext();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const mentionCount = useMentionCountStore((state) => state.serverMentions[serverDetails?.id!]?.[id] || 0);

  return (
    <div
      className="hover-highlight group flex w-full cursor-pointer flex-row items-center gap-2 rounded-md px-1 py-1.5 text-left"
      onClick={(e) => {
        e.stopPropagation();
        navigate(
          `/lobby/servers/${encodeURIComponent(serverDetails!.id)}/channels/${encodeURIComponent(id)}`,
        );
      }}
    >
      {type === ChannelType.Text ? (
        <BsChatText className="inline size-5 fill-gray-500 stroke-gray-500" />
      ) : (
        <BsVolumeUp className="inline size-5 fill-gray-500 stroke-gray-500" />
      )}

      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>

      {mentionCount > 0 ? (
        <span className="flex-none rounded-lg bg-red-500 px-1 py-0.5 text-xs font-bold text-white">
          {mentionCount}
        </span>
      ) : null}

      {hasPermission(ServerPermission.DeleteChannel) && (
        <div
          className={`h-5 flex-none ${isDropdownOpen ? "block" : "hidden group-hover:block"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu.Root open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
            <DropdownMenu.Trigger asChild>
              <IconButton theme="default">
                <BsGearFill className="inline size-4" />
              </IconButton>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="bottom"
                sideOffset={5}
                className="bg-gray-650 w-64 rounded-md p-1.5 shadow-lg"
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                }}
              >
                <DropdownMenu.Item
                  className="dropdown-item-danger"
                  onSelect={() => setDeleteModalState({ type: "channel", id })}
                >
                  Delete channel
                  <BsTrashFill className="ml-auto size-4 fill-red-500" />
                </DropdownMenu.Item>

                <DropdownMenu.Arrow className="fill-gray-650" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )}
    </div>
  );
}
