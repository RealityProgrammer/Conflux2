import {useAuthorization} from "../../contexts/AuthContext.tsx";
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
import SelectableAvatar from "../../components/SelectableAvatar.tsx";
import {useEffect, useRef, useState} from "react";
import {communityServerService} from "../../api/communityServerService.ts";
import DialogForm from "../../components/DialogForm.tsx";
import {HttpStatusCode} from "axios";
import ErrorText from "../../components/ErrorText.tsx";
import ServerAvatar from "../../components/ServerAvatar.tsx";
import {useForm} from "react-hook-form";
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
import {FaGears} from "react-icons/fa6";

function Sidebar() {
  const auth = useAuthorization();
  const navigate = useNavigate();
  const location = useLocation();
  const { effectiveStatus } = usePresence();

  return (
    <aside className="flex-none flex flex-col py-1.5 w-14 gap-1 h-full bg-gray-775 border-r-2 border-r-gray-600">
      <div className="flex justify-center items-center">
        <Tooltip.Provider delayDuration={500}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <UserAvatar
                userId={auth.userAuthorization?.id}
                hasAvatar={auth.userProfile?.hasAvatar ?? false}
                className="flex-none size-10 cursor-pointer"
                onClick={() => {
                  if (location.pathname !== "/lobby/me") {
                    navigate("/lobby/me");
                  }
                }}
                presenceStatus={effectiveStatus}
                presenceStatusCutoff="ring-2 ring-gray-750 bg-gray-750"
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

  useEffect(() => {
    if (open) {
      idempotencyKey.current = crypto.randomUUID();
      console.log("created new idempotency key.");
    } else {
      formMethods.reset();
    }
  }, [open, formMethods]);

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
          formMethods.setError("name", {
            message: details.name[0],
          });
        }

        if (details.avatar && details.avatar.length > 0) {
          formMethods.setError("avatar", {
            message: details.avatar[0],
          })
        }
      } else {
        formMethods.setError("root", {
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
            disabled={formMethods.formState.isSubmitting}
          >
            {formMethods.formState.isSubmitting ? (
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
          <SelectableAvatar
            className="size-48 rounded-full flex-none"
            onAvatarChange={(file) => {
              formMethods.setValue("avatar", file, { shouldValidate: true })
            }}
            fallback={() => (<BsPeople className="fill-black size-5/6"/>)}
          />

          {formMethods.formState.errors.avatar && (
            <ErrorText>{formMethods.formState.errors.avatar.message}</ErrorText>
          )}
        </div>

        <div className="mt-4 w-full">
          <Label.Root className="label block mb-1">Server name</Label.Root>

          <input
            type="text"
            className="input-field h-11 w-full"
            placeholder="Enter server name"
            {...formMethods.register("name")}
          />
        </div>

        {formMethods.formState.errors.name && (
          <ErrorText>{formMethods.formState.errors.name.message}</ErrorText>
        )}
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