import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {
  useEffect,
  useRef,
  useState
} from "react";
import type {ChannelCategoryIdentityDto, CommunityServerChannelIdentityDto, ServiceResponse} from "../../api/responses.ts";
import {communityServerService} from "../../api/communityServerService.ts";
import {DropdownMenu, Label, Select} from "radix-ui";
import IconButton from "../IconButton.tsx";
import {
  BsChatText,
  BsCheck,
  BsChevronDown, BsCopy,
  BsExclamationTriangle, BsFolder,
  BsGearFill, BsPeople, BsPersonPlus,
  BsTrash,
  BsVolumeUp
} from "react-icons/bs";
import {FaChevronRight, FaFolderPlus, FaHashtag, FaVolumeHigh} from "react-icons/fa6";
import Spinner from "../Spinner.tsx";
import AlertActionDialog from "../AlertActionDialog.tsx";
import DialogForm from "../DialogForm.tsx";
import {useFormStatus} from "react-dom";
import {useLocation, useNavigate} from "react-router";
import {useInterval} from "usehooks-ts";
import SelectItem from "../SelectItem.tsx";
import {invitationService} from "../../api/invitationService.ts";
import type {InvitationExpireAfter} from "../../api/requests.ts";

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
  { type: "create_channel", name: string, channelType: "text" | "voice" } |
  { type: "delete_channel_category", id: string } |
  { type: "delete_channel", id: string };

export default function ServerSidebar() {
  const {
    serverId,
    serverSummary,
    appendChannelCategory,
    appendChannel,
    removeChannelCategory,
    removeChannel,
  } = useCommunityServerContext();

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
      removeChannelCategory(id);
    }
  };

  const handleChannelDeletion = async (id: string) => {
    const response = await communityServerService.deleteChannel(serverId, id);

    if (response.success) {
      removeChannel(id);
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
                createStatus={createStatus}
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
                createStatus={createStatus}
                setCreatingState={(value) => {
                  setCreateState(value);
                }}
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
        open={!!createState}
        onOpenChange={(open) => {
          if (!open) {
            setCreateState(undefined);
          }
        }}
        contentClassName="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-128 -translate-x-1/2 -translate-y-1/2 z-55 rounded-md text-white"
        headerIcon={(<BsChatText className="size-10 fill-white"/>)}
        title={"Create new Channel or Category"}
        subtitle={"New territory acquired!"}
        action={(formData) => {
          switch (formData.get("type") as string) {
            case "category":
              handleChannelAction({ type: "create_category", name: formData.get("name") as string });
              break;

            case "text_channel":
              handleChannelAction({ type: "create_channel", name: formData.get("name") as string, channelType: "text" });
              break;

            case "voice_channel":
              handleChannelAction({ type: "create_channel", name: formData.get("name") as string, channelType: "voice" });
              break;
          }

          setCreateState(undefined);
        }}
        submitButton={() => (
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
            id="name"
            name="name"
            className="input-field h-10 w-full"
            placeholder={`Enter name`}
            maxLength={32}
            autoFocus required aria-required
          />
        </div>

        <div className="w-full">
          <Label.Root className="label block mb-1">Type</Label.Root>

          <Select.Root name="type" required defaultValue={ createState ? { category: "category", text: "text_channel", voice: "voice_channel" }[createState?.type] : undefined }>
            <Select.Trigger className="w-full input-field h-10 inline-flex flex-row items-center gap-2 ">
              <Select.Value placeholder="Select type to create..."/>
              <Select.Icon className="fill-white flex-none ml-auto">
                <BsChevronDown className="size-4"/>
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="overflow-hidden bg-gray-700 z-100 text-white rounded-md p-1 w-(--radix-select-trigger-width)"
                position="popper"
                side="bottom"
                sideOffset={4}
              >
                <Select.Viewport>
                  {createState?.targetCategoryId == null && (
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
        </div>
      </DialogForm>
    </aside>
  );
}

function Header({setCreatingState}: {setCreatingState: (state: CreateState) => void}) {
  const { serverId } = useCommunityServerContext();

  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [isOpenInvitationDialog, setIsOpenInvitationDialog] = useState(false);

  const { serverSummary: { name: serverName } } = useCommunityServerContext();

  const handleGetInvitation = async (formData: FormData) => {


    // const invitationId = await invitationService.createInvitation(
    //   serverId,
    //   formData.get("expireAfter") as InvitationExpireAfter,
    //   formData.get("maxUses") as );
  };

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

              <DropdownMenu.Separator className="horizontal-separator"/>

              <DropdownMenu.Item className="dropdown-item-default" onSelect={() => setIsOpenInvitationDialog(true)}>
                Invitation Link

                <BsPersonPlus className="fill-white size-4 ml-auto"/>
              </DropdownMenu.Item>

              <DropdownMenu.Arrow className="fill-gray-650"/>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </section>

      <div
        className="size-full bg-purple-600"
      />

      <DialogForm
        open={isOpenInvitationDialog}
        onOpenChange={setIsOpenInvitationDialog}
        contentClassName="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-128 -translate-x-1/2 -translate-y-1/2 z-55 rounded-md text-white"
        headerIcon={(<BsPersonPlus className="size-10 fill-white"/>)}
        title="Grab an invitation"
        subtitle="Invite people to the fun gang"
        submitButton={() => (<GetInvitationLinkButton/>)}
        action={handleGetInvitation}
      >
        <div className="w-full">
          <Label.Root className="label block mb-1">Expire after</Label.Root>

          <Select.Root name="expireAfter" required defaultValue="FiveMinutes">
            <Select.Trigger className="w-full input-field h-10 inline-flex flex-row items-center gap-2 ">
              <Select.Value placeholder="Select type to create..."/>
              <Select.Icon className="fill-white flex-none ml-auto">
                <BsChevronDown className="size-4"/>
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="overflow-hidden bg-gray-700 z-100 text-white rounded-md w-(--radix-select-trigger-width) max-h-64"
                position="popper"
                side="bottom"
                sideOffset={4}
              >
                <Select.Viewport className="p-1 size-full overflow-y-auto">
                  { [{ label: "5 minutes", value: "FiveMinutes" }, { label: "15 minutes", value: "FifteenMinutes" },
                    { label: "30 minutes", value: "ThirtyMinutes" }, { label: "1 hour", value: "OneHour" },
                    { label: "2 hours", value: "TwoHours" }, { label: "3 hours", value: "ThreeHours" },
                    { label: "6 hours", value: "SixHours" }, { label: "12 hours", value: "TwelveHours" },
                    { label: "1 day", value: "OneDay" }, { label: "1 week", value: "OneWeek" },
                    { label: "2 weeks", value: "TwoWeeks" }, { label: "4 weeks", value: "FourWeeks" },
                    { label: "Infinite", value: "Infinite" }].map(e => (
                    <SelectItem
                      key={e.value}
                      text={e.label}
                      value={e.value}
                    />
                    ))
                  }
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <Label.Root className="label block mb-1 mt-3" htmlFor="maxUses">Max uses</Label.Root>

          <input
            id="maxUses"
            type="number"
            name="maxUses"
            className="w-full input-field h-11"
          />
        </div>
      </DialogForm>
    </header>
  );
}

function GetInvitationLinkButton() {
  const CHARACTERS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const { pending } = useFormStatus();

  const generateRandomInvitationId = (length: number): string => {
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomInd = Math.floor(Math.random() * CHARACTERS.length);
      result += CHARACTERS.charAt(randomInd);
    }

    return result;
  };

  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const [fakeInvitationId, setFakeInvitationId] = useState(generateRandomInvitationId(12));
  useInterval(() => {
    if (!pending) { // have to do this so that the next fake id update doesn't override the pending status
      setFakeInvitationId(generateRandomInvitationId(12));
    }
  }, 100);

  return (
    <div className="flex-1 min-w-0 input-field h-11 px-3 flex items-center gap-2">
      <span className="truncate flex-1 text-gray-500 select-none">{baseUrl}/invite/{fakeInvitationId}</span>

      <button
        type="submit"
        className="flex-none cursor-pointer rounded-md button-theme-primary p-2"
      >
        { pending ? (
          <Spinner className="size-4 fill-white"/>
        ) : (
          <BsCopy className="size-4 fill-white"/>
        )}
      </button>
    </div>
  );
}

interface ChannelCategoryViewProps {
  category: ChannelCategoryIdentityDto;
  createStatus: CreateStatus[];
  setCreatingState: (value: CreateState) => void;
  handleChannelAction: (action: ChannelAction) => void | Promise<void>;
}

function ChannelCategoryView({
  category,
  createStatus,
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
}: {channel: CommunityServerChannelIdentityDto, handleChannelAction: (action: ChannelAction) => void | Promise<void>}) {
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