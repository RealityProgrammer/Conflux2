import {useAuth} from "../../contexts/AuthContext.tsx";
import {Label, Popover, Separator, Tooltip} from "radix-ui";
import {Outlet, useLocation, useNavigate} from "react-router";
import {BsPeople} from "react-icons/bs";
import UserAvatar from "../../components/UserAvatar.tsx";
import {useDocumentTitle} from "usehooks-ts";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import type {
  ServerIdentityDto,
  ServiceResponse
} from "../../api/types.ts";
import IconButton from "../../components/IconButton.tsx";
import SelectableImageInput from "../../components/SelectableImageInput.tsx";
import {useEffect, useRef, useState} from "react";
import {communityServerService} from "../../api/communityServerService.ts";
import DialogForm from "../../components/DialogForm.tsx";
import {HttpStatusCode} from "axios";
import ServerAvatar from "../../components/ServerAvatar.tsx";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useInfiniteGetJoinedCommunityServerQuery
} from "../../graphql/infiniteQueries.ts";
import {useQueryClient} from "@tanstack/react-query";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import Spinner from "../../components/Spinner.tsx";
import {usePresence} from "../../contexts/PresenceContext.tsx";
import {HiOutlineSquares2X2, HiOutlineUserGroup} from "react-icons/hi2";
import {FaGears, FaXmark} from "react-icons/fa6";
import {userService} from "../../api/userService.ts";
import PresenceStatusIcon from "../../components/PresenceStatusIcon.tsx";
import ErrorPopover from "../../components/ErrorPopover.tsx";

function Sidebar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { effectiveStatus } = usePresence();

  return (
    <aside className="flex-none flex flex-col py-1.5 w-14 gap-1 h-full bg-gray-775 border-r-2 border-r-gray-600">
      <div className="flex justify-center items-center">
        <Tooltip.Provider delayDuration={500}>
          <Tooltip.Root>
            <Tooltip.Trigger className="relative" onClick={() => {
              if (location.pathname !== "/lobby/me") {
                navigate("/lobby/me");
              }
            }}>
              <UserAvatar
                src={auth.userProfile?.avatarRevision ? userService.getAvatarUrl(auth.userProfile.id, auth.userProfile.avatarRevision) : undefined}
                className="flex-none size-10 cursor-pointer"
              />

              <PresenceStatusIcon
                status={effectiveStatus}
                className="absolute bottom-0 right-0 translate-x-[10%] translate-y-[10%] rounded-full size-4 border-2 border-gray-750 bg-gray-750"
              />
            </Tooltip.Trigger>

            <Tooltip.Portal>
              <Tooltip.Content side="right" sideOffset={8} className="select-none rounded-lg bg-gray-625 shadow-xl">
                <p className="text-white font-semibold px-3 py-1">To your private space</p>

                <Tooltip.Arrow className="fill-gray-600"/>
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>

      <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-1"/>

      <JoinedCommunityServerScrollList/>

      <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-1"/>

      <div className="flex-none flex flex-col items-center">
        <ExpandableMenuIcon/>
      </div>
    </aside>
  );
}

function JoinedCommunityServerScrollList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = useInfiniteGetJoinedCommunityServerQuery(
    {},
    {
      initialPageParam: { after: null },
      getNextPageParam: (lastPage) => {
        const pageInfo = lastPage?.joinedServers?.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
      staleTime: 30 * 60 * 1000,
    }
  );

  const allElements = data?.pages.flatMap((page) => page?.joinedServers?.nodes ?? []) ?? [];

  // remove joined server from the query list
  useSignalREvent("KickedFromServer", (_serverId: string) => {
    queryClient.invalidateQueries({
      queryKey: useInfiniteGetJoinedCommunityServerQuery.getKey({}),
    });
  });

  return (
    <VirtualizedScrollList
      overscan={10}
      className="flex-1"
      itemCount={allElements.length}
      isLoading={isLoading}
      keyExtractor={(itemIndex) => allElements[itemIndex].id}
      estimateSize={(target) => {
        if (target === "previousLoader" || target === "nextLoader") {
          return 0;
        }

        return 48;
      }}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={() => {
        fetchNextPage()
      }}
      hideVerticalScrollbar={true}
      renderItem={(itemIndex, virtualItem) => {
        const item = allElements[itemIndex];

        return (
          <div className="size-full aspect-square flex justify-center items-center" key={virtualItem.key}>
            <Tooltip.Provider delayDuration={500}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    <ServerAvatar
                      serverId={item.id}
                      hasAvatar={item.hasAvatar}
                      className="flex-none h-10 aspect-square overflow-hidden rounded-full align-middle cursor-pointer"
                      onClick={() => {
                        const dest = `/lobby/servers/${encodeURIComponent(item.id)}`;

                        if (location.pathname !== dest) {
                          navigate(dest);
                        }
                      }}
                    />
                </Tooltip.Trigger>

                <Tooltip.Portal>
                  <Tooltip.Content side="right" sideOffset={8} className="select-none rounded-lg bg-gray-600 shadow-xl">
                    <p className="text-white font-semibold px-3 py-1">{item.name}</p>

                    <Tooltip.Arrow className="fill-gray-600"/>
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        );
      }}
    />
  );
}

const createServerSchema = z.object({
  name: z.string()
    .min(1, "Input name.")
    .max(48, "Name can only have maximum length of 48 characters."),

  avatar: z.file().optional(),
});

function ExpandableMenuIcon() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isCreateServerDialogOpen, setIsCreateServerDialogOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Popover.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <Popover.Trigger asChild>
          <IconButton theme="default">
            <HiOutlineSquares2X2 className="size-10"/>
          </IconButton>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="right"
            sideOffset={12}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-50 overflow-hidden rounded-2xl bg-gray-775 shadow-sm p-1.5 outline-none origin-[50%_100%] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=right]:slide-in-from-left-4 duration-300"
          >
            <div className="flex items-center gap-2">
              <Tooltip.Provider delayDuration={500}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <IconButton theme="default" onClick={() => {
                      setIsMenuOpen(false);
                      setIsCreateServerDialogOpen(true);
                    }}>
                      <HiOutlineUserGroup className="size-10"/>
                    </IconButton>
                  </Tooltip.Trigger>

                  <Tooltip.Portal>
                    <Tooltip.Content side="top" sideOffset={8} className="select-none rounded-lg bg-gray-600 shadow-xl">
                      <p className="text-white font-semibold px-3 py-1">Create your own community</p>

                      <Tooltip.Arrow className="fill-gray-600"/>
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>

              <Tooltip.Provider delayDuration={500}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <IconButton theme="default" onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/settings");
                    }}>
                      <FaGears className="size-10"/>
                    </IconButton>
                  </Tooltip.Trigger>

                  <Tooltip.Portal>
                    <Tooltip.Content side="top" sideOffset={8} className="select-none rounded-lg bg-gray-600 shadow-xl">
                      <p className="text-white font-semibold px-3 py-1">Application settings</p>

                      <Tooltip.Arrow className="fill-gray-600"/>
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>

            <Popover.Arrow className="fill-gray-775" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <CreateServerDialogForm open={isCreateServerDialogOpen} onOpenChange={setIsCreateServerDialogOpen}/>
    </>
  );
}

type CreateServerFormValues = z.infer<typeof createServerSchema>;

function CreateServerDialogForm({
  open,
  onOpenChange,
}: {open: boolean, onOpenChange: (open: boolean) => void}) {
  const queryClient = useQueryClient();
  const idempotencyKey = useRef("");

  const formMethods = useForm<CreateServerFormValues>({
    resolver: zodResolver(createServerSchema),
    defaultValues: {
      name: "",
      avatar: undefined,
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const { control, reset, setError, register, formState: { errors, isSubmitting } } = formMethods;

  useEffect(() => {
    if (open) {
      idempotencyKey.current = crypto.randomUUID();
    } else {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateServerFormValues) => {
    const response: ServiceResponse<ServerIdentityDto> =
      await communityServerService.createServer(idempotencyKey.current, data.name, data.avatar ?? undefined);

    if (response.success) {
      onOpenChange(false);

      queryClient.invalidateQueries({
        queryKey: useInfiniteGetJoinedCommunityServerQuery.getKey({}),
      });
    } else {
      if (response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred") {
        const details = response.error.details as Record<"name" | "avatar", string[]>;

        if (details.name && details.name.length > 0) {
          setError("name", {
            message: details.name[0],
          });
        }

        if (details.avatar && details.avatar.length > 0) {
          setError("avatar", {
            message: details.avatar[0],
          })
        }
      } else {
        setError("root", {
          message: response.error?.message ?? "An unexpected error occurred.",
        });
      }
    }
  };

  return (
    <>
      <DialogForm
        open={open}
        onOpenChange={onOpenChange}
        formMethods={formMethods}
        headerIcon={(<BsPeople className="size-10 fill-white"/>)}
        title="Create a new Community Server"
        subtitle="Give it a name, a vessel. Give it a life..."
        submitButton={(
          <button
            type="submit"
            className="button-theme-primary px-3 h-10 cursor-pointer rounded-md basis-32 flex flex-row justify-center items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Spinner className="size-5 fill-white"/>
            ) : (
              <>Create Server</>
            )}
          </button>
        )}
        onSubmit={onSubmit}
        contentClassName="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-128 -translate-x-1/2 -translate-y-1/2 z-55 rounded-md text-white"
      >
        <div className="flex flex-col items-center">
          <Controller
            control={control}
            name="avatar"
            render={({ field }) => (
              <div className="flex flex-row gap-3">
                <ErrorPopover
                  open={!!errors.avatar}
                  content={errors.avatar?.message}
                >
                  <SelectableImageInput
                    value={field.value}
                    onChange={field.onChange}
                    className="size-48 rounded-full overflow-hidden flex-none"
                    fallback={() => (<BsPeople className="fill-black size-5/6"/>)}
                  />
                </ErrorPopover>

                <div className="p-2 rounded-md bg-black/10 shadow-md self-start border-2 border-gray-600 flex flex-col gap-2">
                  <IconButton type="button" theme="danger" onClick={() => { field.onChange(null) }} disabled={!field.value}>
                    <FaXmark className="size-5"/>
                  </IconButton>
                </div>
              </div>
            )}
          />
        </div>

        <div className="mt-4 w-full">
          <Label.Root className="label block mb-1">Server name</Label.Root>

          <ErrorPopover
            open={!!errors.name}
            content={errors.name?.message}
          >
            <input
              type="text"
              className="input-field h-11 w-full"
              placeholder="Enter server name"
              {...register("name")}
            />
          </ErrorPopover>
        </div>
      </DialogForm>
    </>
  );
}

export default function LobbyLayout() {
  useDocumentTitle("Conflux - Lobby");

  return (
    <div className="h-dvh w-dvw overflow-hidden flex flex-row">
      <Sidebar/>

      <section className="flex-1 overflow-auto bg-gray-675">
        <Outlet/>
      </section>
    </div>
  );
}