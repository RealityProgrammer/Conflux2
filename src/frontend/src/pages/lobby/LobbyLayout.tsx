import {useAuthorization} from "../../contexts/AuthContext.tsx";
import {Separator, Tooltip} from "radix-ui";
import {Outlet, useLocation, useNavigate} from "react-router";
import {BsPeople, BsPlus} from "react-icons/bs";
import UserAvatar from "../../components/UserAvatar.tsx";
import {useDocumentTitle} from "usehooks-ts";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import type {FieldErrors, ServiceResponse} from "../../api/responses.ts";
import IconButton from "../../components/IconButton.tsx";
import SelectableAvatar from "../../components/SelectableAvatar.tsx";
import {useState} from "react";
import {useFormStatus} from "react-dom";
import {communityServerService} from "../../api/communityServerService.ts";
import DialogForm from "../../components/DialogForm.tsx";
import {HttpStatusCode} from "axios";
import ErrorText from "../../components/ErrorText.tsx";
import ServerAvatar from "../../components/ServerAvatar.tsx";
import {useForm} from "react-hook-form";
import {z} from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {useInfiniteGetJoinedCommunityServerQuery} from "../../graphql/infiniteQueries.ts";

function Sidebar() {
  const auth = useAuthorization();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="flex-none flex flex-col py-1.5 w-14 gap-1 h-full bg-gray-775 border-r-2 border-r-gray-600">
      <div className="flex justify-center items-center">
        <Tooltip.Provider delayDuration={500}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <UserAvatar
                userId={auth.userAuthorization?.id}
                hasAvatar={auth.userProfile?.hasAvatar ?? false}
                className="flex-none size-12 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
                onClick={() => {
                  if (location.pathname !== "/lobby/me") {
                    navigate("/lobby/me");
                  }
                }}
              />
            </Tooltip.Trigger>

            <Tooltip.Portal>
              <Tooltip.Content side="right" sideOffset={8} className="select-none rounded-lg bg-gray-600 shadow-xl">
                <p className="text-white font-semibold px-3 py-1">To your private space</p>

                <Tooltip.Arrow className="fill-gray-600"/>
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>

      <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-1.5"/>

      <JoinedCommunityServerScrollList/>

      <div className="flex-none flex flex-col items-center">
        <CreateCommunityServerButton/>
      </div>
    </aside>
  );
}

function JoinedCommunityServerScrollList() {
  const navigate = useNavigate();

  // const {
  //   queryResult: {
  //     hasNextPage,
  //     isFetchingNextPage,
  //     fetchNextPage,
  //     isLoading,
  //   },
  //   allElements,
  // } = useJoinedServersQuery();

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

function CreateCommunityServerSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="button-theme-primary px-3 py-2 cursor-pointer rounded-md basis-32"
      disabled={pending}
    >
      Create Server
    </button>
  );
}

const createServerSchema = z.object({
  name: z.string()
    .min(1, "Input name.")
    .max(48, "Name can only have maximum length of 48 characters."),

  avatar: z.file().optional(),
});

type CreateServerFormValues = z.infer<typeof createServerSchema>;

function CreateCommunityServerButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (open) {
      methods.reset();
      setIdempotencyKey(crypto.randomUUID());
    }
  };

  const onSubmit = async (data: CreateServerFormValues) => {
    const response: ServiceResponse =
      await communityServerService.create(idempotencyKey, data.name, data.avatar ?? undefined);

    if (response.success) {
      setIsOpen(false);
    } else {
      if (response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred") {
        const details = response.error.details as FieldErrors<"name" | "avatar">;

        if (details.name && details.name.length > 0) {
          methods.setError("name", {
            message: details.name[0],
          });
        }

        if (details.avatar && details.avatar.length > 0) {
          methods.setError("avatar", {
            message: details.avatar[0],
          })
        }
      } else {
        methods.setError("root", {
          message: response.error?.message ?? "An unexpected error occurred.",
        });
      }
    }
  };

  const methods = useForm<CreateServerFormValues>({
    resolver: zodResolver(createServerSchema),
    defaultValues: {
      name: "",
      avatar: undefined,
    },
    mode: "onSubmit",
  });

  return (
    <>
      <Tooltip.Provider delayDuration={500}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <IconButton isLoading={false} theme="default" className="hover-highlight rounded-full" onClick={() => handleOpenChange(true)}>
              <BsPlus className="size-10"/>
            </IconButton>
          </Tooltip.Trigger>

          <Tooltip.Portal>
            <Tooltip.Content side="right" sideOffset={8} className="select-none rounded-lg bg-gray-600 shadow-xl">
              <p className="text-white font-semibold px-3 py-1">Create your own community</p>

              <Tooltip.Arrow className="fill-gray-600"/>
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>

      <DialogForm
        open={isOpen} onOpenChange={handleOpenChange}
        methods={methods}
        headerIcon={(<BsPeople className="size-10 fill-white"/>)}
        title="Create a new Community Server"
        subtitle="Give it a name, a vessel. Give it a life..."
        submitButton={(<CreateCommunityServerSubmitButton/>)}
        onSubmit={onSubmit}
        contentClassName="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-128 -translate-x-1/2 -translate-y-1/2 z-55 rounded-md text-white"
      >
        <SelectableAvatar
          className="size-48 rounded-full flex-none"
          onAvatarChange={(file) => {
            methods.setValue("avatar", file, { shouldValidate: true })
          }}
          fallback={() => (<BsPeople className="fill-black size-5/6"/>)}
        />

        {methods.formState.errors.avatar && (
          <ErrorText>{methods.formState.errors.avatar.message}</ErrorText>
        )}

        <div className="mt-4 w-full">
          <input
            type="text"
            className="input-field h-11 w-full"
            placeholder="Enter server name"
            {...methods.register("name")}
          />
        </div>

        {methods.formState.errors.name && (
          <ErrorText>{methods.formState.errors.name.message}</ErrorText>
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