import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {useEffect, useState} from "react";
import {
  type ChannelCategoryDetailDto,
  type ChannelCategoryIdentityDto,
  type ServerChannelIdentityDto,
  type ServiceResponse
} from "../../api/types.ts";
import {communityServerService} from "../../api/communityServerService.ts";
import {DropdownMenu, Label, Select} from "radix-ui";
import IconButton from "../IconButton.tsx";
import {
  BsChatText,
  BsChevronDown,
  BsExclamationTriangle,
  BsFolder,
  BsGearFill,
  BsTrash,
  BsVolumeUp
} from "react-icons/bs";
import {FaChevronRight, FaHashtag, FaVolumeHigh} from "react-icons/fa6";
import Spinner from "../Spinner.tsx";
import AlertActionDialog from "../AlertActionDialog.tsx";
import DialogForm from "../DialogForm.tsx";
import {useNavigate} from "react-router";
import SelectItem from "../SelectItem.tsx";
import {z} from "zod";
import ServerSidebarHeader from "./ServerSidebarHeader.tsx";
import {Controller, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import ErrorText from "../ErrorText.tsx";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  ServerChannelCategoryCreatedEvent,
  ServerChannelCategoryDeletedEvent,
  ServerChannelCreatedEvent, ServerChannelDeletedEvent
} from "../../api/events.ts";
import {ChannelType} from "../../api/schema.ts";

const createChannelOrCategorySchema = z.object({
  idempotencyKey: z.string(),
  type: z.enum(["category", "text", "voice"]),
  targetCategoryId: z.string().optional().nullable(),
  name: z.string()
    .min(1, "Name is required.")
    .max(32, "Name can only have maximum length of 32 characters."),
});

type CreateChannelOrCategoryFormValues = z.infer<typeof createChannelOrCategorySchema>;

type DeletionState = {
  type: "category" | "channel";
  id: string;
}

type CreateStatus = CreateChannelOrCategoryFormValues & {
  id: string;
  status: "creating" | "error";
  name: string;
}

type ChannelAction =
  { type: "create_category", name: string, idempotencyKey: string } |
  { type: "create_channel", name: string, channelType: "text" | "voice", idempotencyKey: string, targetCategoryId: string | null } |
  { type: "delete_channel_category", id: string } |
  { type: "delete_channel", id: string };

export default function ServerSidebar() {
  const {
    serverId,
    serverSummary,
    memberPermissions,
    appendChannelCategory,
    appendChannel,
    removeChannelCategory,
    removeChannel,
  } = useCommunityServerContext();
  const [createStatus, setCreateStatus] = useState<CreateStatus[]>([]);
  const [isCreateChannelOrCategoryDialogOpen, setIsCreateChannelOrCategoryDialogOpen] = useState(false);
  const [deletionState, setDeletionState] = useState<DeletionState | undefined>();

  useEffect(() => {
    if (isCreateChannelOrCategoryDialogOpen && !memberPermissions.effectivePermissions.CreateChannel) {
      setIsCreateChannelOrCategoryDialogOpen(false);
    }
  }, [memberPermissions]);

  const formMethods = useForm<CreateChannelOrCategoryFormValues>({
    resolver: zodResolver(createChannelOrCategorySchema),
    mode: "onSubmit",
  });

  const handleChannelAction = async (action: ChannelAction) => {
    switch (action.type) {
      case "create_category": {
        const operationId = crypto.randomUUID();
        setCreateStatus(prev => [...prev, {
          id: operationId,
          status: "creating",
          name: action.name,
          type: "category",
          idempotencyKey: action.idempotencyKey,
          targetCategoryId: null,
        }]);

        const response: ServiceResponse<ChannelCategoryIdentityDto> = await communityServerService.createChannelCategory(
          action.idempotencyKey,
          serverId,
          action.name
        );

        if (response.success) {
          setCreateStatus((prev) => [...prev.filter(s => s.id !== operationId)]);
          appendChannelCategory(response.data!.id, response.data!.name);
        } else {
          setCreateStatus((prev) => prev.map(s => s.id === operationId ? {
            ...s,
            status: "error",
          } : s));
        }
        break;
      }

      case "create_channel": {
        const operationId = crypto.randomUUID();
        setCreateStatus(prev => [...prev, {
          id: operationId,
          status: "creating",
          name: action.name,
          type: action.channelType,
          idempotencyKey: action.idempotencyKey,
          targetCategoryId: action.targetCategoryId,
        }]);

        const response: ServiceResponse<ServerChannelIdentityDto> = await communityServerService.createChannel(
          action.idempotencyKey,
          serverId,
          action.name,
          action.channelType,
          action.targetCategoryId
        );

        if (response.success && response.data) {
          const channelDto: ServerChannelIdentityDto = response.data;

          setCreateStatus((prev) => [...prev.filter(s => s.id !== operationId)]);
          appendChannel(channelDto.id, channelDto.name, channelDto.channelType === ChannelType.CommunityServerText ? "text" : "voice", action.targetCategoryId);
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
      removeChannelCategory(id);
    }
  };

  const handleChannelDeletion = async (id: string) => {
    const response = await communityServerService.deleteChannel(serverId, id);

    if (response.success) {
      removeChannel(id);
    }
  };

  useSignalREvent("ServerChannelCategoryCreated", (event: ServerChannelCategoryCreatedEvent) => {
    if (event.serverId !== serverId) {
      return;
    }

    appendChannelCategory(event.categoryIdentity.id, event.categoryIdentity.name);
  });

  useSignalREvent("ServerChannelCategoryDeleted", (event: ServerChannelCategoryDeletedEvent) => {
    if (event.serverId !== serverId) {
      return;
    }

    removeChannelCategory(event.categoryId);
  });

  useSignalREvent("ServerChannelCreated", (event: ServerChannelCreatedEvent) => {
    if (event.serverId !== serverId) {
      return;
    }

    appendChannel(event.channel.id, event.channel.name, event.channel.channelType === ChannelType.CommunityServerText ? "text" : "voice", event.channel.categoryId);
  });

  useSignalREvent("ServerChannelDeleted", (event: ServerChannelDeletedEvent) => {
    if (event.serverId !== serverId) {
      return;
    }

    removeChannel(event.channelId);
  });

  return (
    <aside
      className="flex-none basis-64 h-full bg-gray-725 border-r-2 border-r-gray-600 text-white overflow-hidden flex flex-col"
    >
      <ServerSidebarHeader onRequestCreate={(type, idempotencyKey) => {
        switch (type) {
          case "category": formMethods.setValues({ type: "category", idempotencyKey, targetCategoryId: null }); break;
          case "text_channel": formMethods.setValues({ type: "text", idempotencyKey, targetCategoryId: null }); break;
          case "voice_channel": formMethods.setValues({ type: "voice", idempotencyKey, targetCategoryId: null }); break;
        }

        setIsCreateChannelOrCategoryDialogOpen(true);
      }}/>

      <section className="mt-2 px-1 overflow-y-auto scrollbar-hide">
        {serverSummary.channelCategories.filter(c => !c.id).map(c => {
          return (
            <ChannelCategoryView
              key={c.id}
              category={c}
              createStatus={createStatus}
              setCreateValues={(idempotencyKey, type) => {
                formMethods.setValues({ idempotencyKey, type, targetCategoryId: c.id });
                setIsCreateChannelOrCategoryDialogOpen(true);
              }}
              handleChannelAction={handleChannelAction}
            />
          );
        })}

        {serverSummary.channelCategories.filter(c => !!c.id).map(c => {
          return (
            <ChannelCategoryView
              key={c.id}
              category={c}
              createStatus={createStatus}
              setCreateValues={(idempotencyKey, type) => {
                formMethods.setValues({ idempotencyKey, type, targetCategoryId: c.id });
                setIsCreateChannelOrCategoryDialogOpen(true);
              }}
              handleChannelAction={handleChannelAction}
            />
          );
        })}
      </section>

      <AlertActionDialog
        panelClassName="w-128"
        open={!!deletionState}
        onOpenChange={(open) => {
          if (!open) {
            setDeletionState(undefined);
          }
        }}
        title={deletionState?.type === "channel" ? "Delete channel" : "Delete channel category"}
        description={() => {
          return deletionState?.type === "category" ? (
            <>
              <span className="block">Are you sure you want to delete it? This action cannot be undone.</span>

              <span className="block">The inner channels will be uncategorized.</span>
            </>
          ) : (
            "Are you sure you want to delete it? This action cannot be undone."
          )
        }}
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

      <DialogForm
        open={isCreateChannelOrCategoryDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            formMethods.reset();
            setIsCreateChannelOrCategoryDialogOpen(false);
          }
        }}
        methods={formMethods}
        contentClassName="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-128 -translate-x-1/2 -translate-y-1/2 rounded-md text-white"
        headerIcon={(<BsChatText className="size-10 fill-white"/>)}
        title={"Create new Channel or Category"}
        subtitle={"New territory acquired!"}
        onSubmit={(value: CreateChannelOrCategoryFormValues) => {
          switch (value.type) {
            case "category":
              handleChannelAction({
                type: "create_category",
                name: value.name,
                idempotencyKey: value.idempotencyKey
              });
              break;

            case "text":
              handleChannelAction({
                type: "create_channel",
                name: value.name,
                channelType: "text",
                idempotencyKey: value.idempotencyKey,
                targetCategoryId: value.targetCategoryId ?? null
              });
              break;

            case "voice":
              handleChannelAction({
                type: "create_channel",
                name: value.name,
                channelType: "voice",
                idempotencyKey: value.idempotencyKey,
                targetCategoryId: value.targetCategoryId ?? null
              });
              break;
          }

          setIsCreateChannelOrCategoryDialogOpen(false);
          formMethods.reset();
        }}
        submitButton={(
          <button
            type="submit"
            className="button-theme-primary px-3 py-2 cursor-pointer rounded-md basis-32"
          >
            Create
          </button>
        )}
      >
        <div className="w-full mb-2">
          <Label.Root className="label block mb-1" htmlFor="name">Label</Label.Root>

          <input
            type="text"
            className="input-field h-10 w-full"
            placeholder={`Enter name`}
            {...formMethods.register("name")}
          />

          {formMethods.formState.errors.name && (
            <ErrorText>{formMethods.formState.errors.name.message}</ErrorText>
          )}
        </div>

        <div className="w-full">
          <Label.Root className="label block mb-1">Type</Label.Root>

          <Controller
            control={formMethods.control}
            name="type"
            render={({field}) => (
              <Select.Root value={ field.value ? { category: "category", text: "text_channel", voice: "voice_channel" }[field.value] : undefined } onValueChange={field.onChange}>
                <Select.Trigger className="w-full input-field h-10 inline-flex flex-row items-center gap-2 ">
                  <Select.Value placeholder="Select type to create..."/>
                  <Select.Icon className="fill-white flex-none ml-auto">
                    <BsChevronDown className="size-4"/>
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    className="overflow-hidden bg-gray-700 text-white rounded-md p-1 w-(--radix-select-trigger-width)"
                    position="popper"
                    side="bottom"
                    sideOffset={4}
                  >
                    <Select.Viewport>
                      {formMethods.getValues().targetCategoryId == null && (
                        <SelectItem
                          text="Category"
                          value="category"
                          icon={<BsFolder className="fill-white size-4 flex-none" />}
                        />
                      )}

                      <SelectItem
                        text="Text Channel"
                        value="text_channel"
                        icon={<BsChatText className="fill-white size-4 flex-none"/>}
                      />

                      <SelectItem
                        text="Voice Channel"
                        value="voice_channel"
                        icon={<BsVolumeUp className="fill-white size-4 flex-none"/>}
                      />
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            )}
          />
        </div>
      </DialogForm>
    </aside>
  );
}

interface ChannelCategoryViewProps {
  category: ChannelCategoryDetailDto;
  createStatus: CreateStatus[];
  setCreateValues: (idempotencyKey: string, type: "text" | "voice") => void;
  handleChannelAction: (action: ChannelAction) => void | Promise<void>;
}

function ChannelCategoryView({
  category,
  createStatus,
  setCreateValues,
  handleChannelAction,
}: ChannelCategoryViewProps) {
  const { memberPermissions } = useCommunityServerContext();

  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);

  return (
    <>
      {category.id && (
        <div className="flex flex-row items-center gap-2 mb-1 group cursor-pointer hover-highlight p-1 rounded-md" onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
          <FaChevronRight className={`size-3.5 transition-transform duration-150 ease-in-out ${isCategoryOpen ? 'rotate-90' : 'rotate-0'}`}/>

          <span className="text-gray-300 text-sm line-clamp-1 select-none flex-1">{category.name}</span>

          {(memberPermissions.effectivePermissions.CreateChannel || memberPermissions.effectivePermissions.DeleteChannel) && (
            <div className={`h-5 items-center justify-center ${isOpenDropdown ? 'flex' : 'hidden group-hover:flex'}`}>
              <DropdownMenu.Root open={isOpenDropdown} onOpenChange={setIsOpenDropdown} modal={false}>
                <DropdownMenu.Trigger asChild>
                  <IconButton theme="default" onClick={(e) => e.stopPropagation()}>
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
                    {memberPermissions.effectivePermissions.CreateChannel && (
                      <>
                        <DropdownMenu.Item className="dropdown-item-default mb-1" onSelect={() => {
                          setIsCategoryOpen(true);
                          setCreateValues(crypto.randomUUID(), "text");
                        }}>
                          Create text channel

                          <FaHashtag className="fill-white size-4 ml-auto"/>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item className="dropdown-item-default mb-1" onSelect={() => {
                          setIsCategoryOpen(true);
                          setCreateValues(crypto.randomUUID(), "voice");
                        }}>
                          Create voice channel

                          <FaVolumeHigh className="fill-white size-4 ml-auto"/>
                        </DropdownMenu.Item>
                      </>
                    )}

                    {memberPermissions.effectivePermissions.DeleteChannel && (
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
                    )}

                    <DropdownMenu.Arrow className="fill-gray-650"/>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          )}
        </div>
      )}

      {isCategoryOpen && (
        <>
          {category.channels.map(c => <ChannelButton key={c.id} channel={c} handleChannelAction={handleChannelAction}/>)}

          {createStatus.filter(s => s.targetCategoryId === category.id).map(s => {
            return (
              <ChannelCreatingStatusView key={s.id} status={s}/>
            );
          })}
        </>
      )}
    </>
  );
}

function ChannelButton({
  channel,
  handleChannelAction
}: {channel: ServerChannelIdentityDto, handleChannelAction: (action: ChannelAction) => void | Promise<void>}) {
  const { serverId } = useCommunityServerContext();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      key={channel.id}
      className="px-1 py-1 hover-highlight w-full rounded-md cursor-pointer text-left mb-1 flex flex-row items-center group"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/lobby/servers/${encodeURIComponent(serverId)}/channels/${encodeURIComponent(channel.id)}`);
      }}
    >
      {channel.channelType === "CommunityServerText" ? (
        <BsChatText className="size-6 fill-gray-500 stroke-gray-500 inline mr-1"/>
      ) : (
        <BsVolumeUp className="size-6 fill-gray-500 stroke-gray-500 inline mr-1"/>
      )}

      <span className="flex-1 truncate text-sm min-w-0">{channel.name}</span>

      <div className={`h-5 flex-none ${isDropdownOpen ? 'block' : 'hidden group-hover:block'}`} onClick={(e) => e.stopPropagation()}>
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