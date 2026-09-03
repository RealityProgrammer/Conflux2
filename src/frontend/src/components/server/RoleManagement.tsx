import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {
  type GetServerRolesByServerIdQuery,
  useInfiniteGetServerRolesByServerIdQuery
} from "../../graphql/infiniteQueries.ts";
import {useEffect, useState} from "react";
import {BsCircleFill, BsPlusLg} from "react-icons/bs";
import VirtualizedScrollList from "../VirtualizedScrollList.tsx";
import UserAvatar from "../UserAvatar.tsx";
import DateTimeText from "../DateTimeText.tsx";
import PermissionStatesPill from "./PermissionStatesPill.tsx";
import {Accordion, Separator} from "radix-ui";
import IconButton from "../IconButton.tsx";
import {z} from "zod";
import {Controller, type SubmitHandler, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {ServerPermission, SpecialRoleType} from "../../graphql/types.ts";
import {FaSave} from "react-icons/fa";
import {FaPencil, FaXmark} from "react-icons/fa6";
import ErrorPopover from "../ErrorPopover.tsx";
import {communityServerService} from "../../api/communityServerService.ts";
import Spinner from "../Spinner.tsx";
import {toast} from "react-toastify";
import type {ServerRoleDto} from "../../api/types.ts";
import {type InfiniteData, useQueryClient} from "@tanstack/react-query";
import {PermissionState} from "../../api/schema.ts";
import {useDebounceValue} from "usehooks-ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {ServerRoleCreatedEvent, ServerRoleDeletedEvent} from "../../api/events.ts";

type RoleDisplayElement = NonNullable<NonNullable<GetServerRolesByServerIdQuery["communityServerRolesByServerId"]>["nodes"]>[number];

export default function RoleManagement() {
  const { serverId } = useCommunityServerContext();

  const queryClient = useQueryClient();
  const [isEditingRole, setIsEditingRole] = useState(false);

  const [roleName, setRoleName] = useDebounceValue("", 500);

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = useInfiniteGetServerRolesByServerIdQuery({
    serverId,
    nameFilter: roleName,
    after: null,
  }, {
    initialPageParam: { after: null },
    getNextPageParam: (lastPage: GetServerRolesByServerIdQuery): { after: string } | undefined => {
      const pageInfo = lastPage?.communityServerRolesByServerId?.pageInfo;

      if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
        return { after: pageInfo.endCursor };
      }

      return undefined;
    },
    staleTime: 15 * 60 * 1000,
  });

  const invalidateRoleQuery = () => {
    queryClient.invalidateQueries({
      queryKey: useInfiniteGetServerRolesByServerIdQuery.getKey({ serverId, nameFilter: roleName, after: null }),
    });
  };

  const updateRoleData = (role: ServerRoleDto) => {
    queryClient.setQueryData<InfiniteData<GetServerRolesByServerIdQuery>>(
      useInfiniteGetServerRolesByServerIdQuery.getKey({ serverId, nameFilter: roleName, after: null }),
      (oldData: NoInfer<InfiniteData<GetServerRolesByServerIdQuery>> | undefined): NoInfer<InfiniteData<GetServerRolesByServerIdQuery>> | undefined => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            communityServerRolesByServerId: !page.communityServerRolesByServerId ? null : {
              ...page.communityServerRolesByServerId!,
              nodes: page.communityServerRolesByServerId?.nodes!.map(node => {
                if (node.id !== role.id) {
                  return node;
                }

                return {
                  ...node,
                  name: role.name,
                  authorizeLevel: role.authorizeLevel,
                  permissions: Object.keys(role.permissions).map((key: string) => {
                    return {
                      permission: key as ServerPermission,
                      state: role.permissions[key as ServerPermission] ?? PermissionState.Inherit,
                    }
                  }),
                };
              }),
            },
          })),
        };
      }
    );
  };

  const deleteRoleData = (roleId: string) => {
    queryClient.setQueryData<InfiniteData<GetServerRolesByServerIdQuery>>(
      useInfiniteGetServerRolesByServerIdQuery.getKey({ serverId, nameFilter: roleName, after: null }),
      (oldData: NoInfer<InfiniteData<GetServerRolesByServerIdQuery>> | undefined): NoInfer<InfiniteData<GetServerRolesByServerIdQuery>> | undefined => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            communityServerRolesByServerId: !page.communityServerRolesByServerId ? null : {
              ...page.communityServerRolesByServerId!,
              nodes: page.communityServerRolesByServerId?.nodes!.filter(node => node.id !== roleId),
            },
          })),
        };
      }
    );
  };

  const allRoles: RoleDisplayElement[] =
    data?.pages.flatMap((page: GetServerRolesByServerIdQuery): RoleDisplayElement[] => page?.communityServerRolesByServerId?.nodes ?? []) ?? [];

  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>();

  const selectedRole = allRoles.find(role => role.id === selectedRoleId);

  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleSelectRole = (role: RoleDisplayElement) => {
    if (isFormDirty) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      toast.warn((<p className="text-sm">You have unsaved role changes.</p>));

      return;
    }

    setSelectedRoleId(role.id);
    setIsEditingRole(false);
  };

  useSignalREvent("ServerRoleDeleted", (event: ServerRoleDeletedEvent) => {
    if (serverId !== event.serverId) return;

    deleteRoleData(event.roleId);

    if (selectedRoleId === event.roleId) {
      setSelectedRoleId(undefined);
    }
  });

  return (
    <>
      <header className="flex-none mb-0">
        <h3 className="text-xl font-bold text-white">Role Management</h3>
        <p className="text-sm text-gray-400">
          Where power trips are just a click away. Handle with care (or don't, we're not your mom).
        </p>
      </header>

      <div className="flex-1 flex gap-2 min-h-0">
        <section className="w-48 flex flex-col bg-gray-700 rounded-lg border-2 border-gray-600">
          <RoleList
            roles={allRoles}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={() => {
              fetchNextPage()
            }}
            invalidateRoleQuery={invalidateRoleQuery}
            roleName={roleName}
            setRoleName={setRoleName}
            selectedRoleId={selectedRoleId}
            setSelectedRole={handleSelectRole}
            deleteRoleData={deleteRoleData}
          />
        </section>

        <section className={`flex-1 bg-gray-700 rounded-lg p-3 overflow-y-auto border-gray-600 border-2 space-y-2 transition-colors ${isShaking ? "animate-horizontalShake" : ""}`}>
          {selectedRoleId && selectedRole ? (
            <RoleDetails
              key={selectedRoleId}
              role={selectedRole}
              isEditingRole={isEditingRole}
              setIsEditingRole={setIsEditingRole}
              setIsFormDirty={setIsFormDirty}
              updateRoleData={updateRoleData}
              deleteRoleData={deleteRoleData}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 select-none">
              Select a role to view details
            </div>
          )}
        </section>
      </div>
    </>
  );
}

type RoleListProps = {
  roles: RoleDisplayElement[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  invalidateRoleQuery: () => void;
  roleName: string;
  setRoleName: (value: string) => void;
  selectedRoleId?: string;
  setSelectedRole: (role: RoleDisplayElement) => void;
  deleteRoleData: (roleId: string) => void;
};

function RoleList({
  roles,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  invalidateRoleQuery,
  roleName,
  setRoleName,
  selectedRoleId,
  setSelectedRole,
  deleteRoleData,
}: RoleListProps) {
  const { serverId, memberPermissions } = useCommunityServerContext();

  useSignalREvent("ServerRoleCreated", (event: ServerRoleCreatedEvent) => {
    if (serverId !== event.serverId) return;

    invalidateRoleQuery();
  });

  return (
    <>
      <div className="flex flex-row items-center gap-1 pb-2 border-b-2 border-b-gray-600 p-2">
        <input
          type="text"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          placeholder="New role name"
          className="flex-1 input-field h-8 text-sm min-w-0"
        />

        {memberPermissions.effectivePermissions.CreateRole && (
          <button
            // onClick={handleCreateRole}
            className="flex-none p-1.5 button-theme-primary rounded cursor-pointer"
            title="Create role"
          >
            <BsPlusLg className="w-4 h-4" onClick={invalidateRoleQuery}/>
          </button>
        )}
      </div>

      <VirtualizedScrollList
        itemCount={roles.length}
        isLoading={isLoading}
        estimateSize={() => 36}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={() => {
          fetchNextPage();
        }}
        renderItem={(itemIndex) => {
          const role: RoleDisplayElement = roles[itemIndex];

          return (
            <button
              className={`w-full flex flex-row text-left items-center hover-highlight gap-2 px-2 cursor-pointer ${selectedRoleId === role.id ? "bg-white/8" : ""}`}
              onClick={() => setSelectedRole(role)}
            >
              <BsCircleFill className="flex-none size-2.5 fill-blue-500"/>

              <span className="flex-1 truncate text-sm">{role.name}</span>
              <span className="flex-none truncate text-gray-500 text-xs">{role.numMembers}</span>
            </button>
          )
        }}
        hideVerticalScrollbar={true}
      />
    </>
  );
}

const updateRoleSchema = z.object({
  name: z.string().min(1, {error: "Name cannot be empty."}).max(32, {error: "Name can only have maximum length of 32 characters."}),
  authorizeLevel: z.number({error: "A valid integer number is required."})
    .int({error: "A valid integer number is required."})
    .min(1, "A positive integer number is required.")
    .max(500000, "Value must be less than or equal to 500000."),

  permissions: z.object({
    [ServerPermission.CreateRole]: z.enum(PermissionState),
    [ServerPermission.UpdateRole]: z.enum(PermissionState),
    [ServerPermission.DeleteRole]: z.enum(PermissionState),
    [ServerPermission.CreateChannel]: z.enum(PermissionState),
    [ServerPermission.DeleteChannel]: z.enum(PermissionState),
  }),
});

type UpdateRoleFormValues = z.infer<typeof updateRoleSchema>;

type RoleDetailsProps = {
  role: RoleDisplayElement;
  isEditingRole: boolean;
  setIsEditingRole: (value: boolean) => void;
  setIsFormDirty: (value: boolean) => void;
  updateRoleData: (value: ServerRoleDto) => void;
  deleteRoleData: (roleId: string) => void;
}

function RoleDetails({
  role,
  isEditingRole,
  setIsEditingRole,
  setIsFormDirty,
  updateRoleData,
  deleteRoleData,
}: RoleDetailsProps) {
  const { serverId, memberPermissions } = useCommunityServerContext();

  const isEditable = memberPermissions.authorizeLevel >= role.authorizeLevel && role.specialRoleType != SpecialRoleType.Owner;

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateRoleFormValues>({
    resolver: zodResolver(updateRoleSchema),
    mode: "onSubmit",
    defaultValues: {
      name: role.name,
      authorizeLevel: role.authorizeLevel,
      permissions: role.specialRoleType === SpecialRoleType.Owner ? Object.values(ServerPermission).reduce((acc, curr) => {
        return {...acc, [curr]: PermissionState.Enable };
      }, {}) : Object.values(ServerPermission).reduce((acc, curr) => {
        return {...acc, [curr]: role.permissions.find(p => p.permission === curr)?.state ?? PermissionState.Inherit}
      }, {}),
    },
  });

  useEffect(() => {
    setIsFormDirty(isDirty);

    return () => setIsFormDirty(false);
  }, [isDirty, setIsFormDirty]);

  const handleUpdateRole: SubmitHandler<UpdateRoleFormValues> = async (data: UpdateRoleFormValues) => {
    if (!isEditable) return;

    const response = await communityServerService.updateRole(
      serverId,
      role.id,
      {
        name: data.name,
        authorizeLevel: data.authorizeLevel,
        permissionStates: data.permissions,
      }
    );

    setIsEditingRole(false);

    if (response.success && response.data) {
      updateRoleData(response.data);
      setIsFormDirty(false);
    } else {
      setError("root", {message: response.error?.message ?? "Unknown error."});
    }
  };

  const handleDeleteRole = async () => {
    const response = await communityServerService.deleteRole(serverId, role.id);

    if (response.success) {
      deleteRoleData(role.id);
    } else {
      toast.error("Failed to delete role.");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleUpdateRole)}>
      <header className="flex flex-row items-center justify-between mb-2">
        <div className="flex flex-row gap-2 items-center">
          {isEditingRole ? (
            <input
              className="h-7 input-field w-48"
              defaultValue={getValues("name")}
              {...register("name")}
            />
          ) : (
            <h4 className="text-xl font-semibold text-white">{role.name}</h4>
          )}

          <span className="text-xs bg-gray-600 px-2 py-0.5 rounded ml-1">
            {role.numMembers} members
          </span>
        </div>

        {memberPermissions.effectivePermissions.UpdateRole && isEditable && (
          <>
            {isEditingRole ? (
              <div className="flex flex-row gap-2">
                <IconButton type="button" theme="danger" onClick={() => {
                  setIsEditingRole(false);
                  reset();
                }} disabled={isSubmitting}>
                  <FaXmark className="size-5"/>
                </IconButton>

                {isSubmitting ? (
                  <Spinner className="size-5 fill-white"/>
                ) : (
                  <IconButton type="submit" theme="info">
                    <FaSave className="size-5"/>
                  </IconButton>
                )}
              </div>
              ) : (
              <IconButton theme="info" onClick={() => setIsEditingRole(!isEditingRole)}>
                <FaPencil className="size-5"/>
              </IconButton>
            )}
          </>
        )}
      </header>

      <section>
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
          General Information
        </h4>

        <div className="bg-gray-700 border-2 border-gray-600 rounded-lg p-3 flex flex-col shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-300">Created by</span>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-550">
              <UserAvatar
                userId={role.creatorUser?.id}
                hasAvatar={role.creatorUser?.hasAvatar ?? false}
                className="size-5 rounded-full overflow-hidden"
              />

              <span className="text-sm font-medium text-zinc-200">
                {role.creatorUser?.displayName ?? "Deleted User"}
              </span>

              <span className="text-xs text-zinc-500 ml-1 border-l border-zinc-700 pl-2">
                <DateTimeText value={new Date(role.createdAt)} />
              </span>
            </div>
          </div>

          <Separator.Root className="horizontal-separator my-3" />

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-300">Special Role</span>

            <span className="text-sm font-medium text-zinc-300 px-2.5 py-1 rounded border border-zinc-700/50">
              {role.specialRoleType}
            </span>
          </div>

          <Separator.Root className="horizontal-separator my-3" />

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-300">Authorize Level</span>

            {isEditingRole ? (
              <ErrorPopover
                open={!!errors.authorizeLevel}
                content={errors.authorizeLevel?.message}
              >
                <input
                  type="text"
                  className="input-field h-[29.6px] text-sm w-64"
                  placeholder="Enter Authorize Level"
                  {...register("authorizeLevel", {
                    setValueAs: (value) => (value === "" || value == null ? null : Number(value))
                  })}
                />
              </ErrorPopover>
            ) : (
              <span className="text-sm font-mono text-zinc-300 px-2.5 py-1 rounded border border-zinc-700/50">
                {role.authorizeLevel}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-1 mt-2">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Permissions
        </h4>

        <Accordion.Root
          type="multiple"
        >
          <Accordion.Item value="role" className="border-2 border-gray-600 rounded-md mb-1">
            <Accordion.Trigger className="text-left text-sm text-gray-300 cursor-pointer hover-highlight w-full p-2">
              Role
            </Accordion.Trigger>

            <Accordion.Content className="border-t-2 border-t-gray-600">
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-2">
                <li className="flex flex-row items-center gap-2 text-sm">
                  <span className="flex-1">Create Role</span>

                  <Controller
                    control={control}
                    name="permissions.CreateRole"
                    render={({field}) => (
                      <ErrorPopover
                        open={!!errors.permissions?.CreateRole}
                        content={errors.permissions?.CreateRole?.message}
                      >
                        <PermissionStatesPill
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!isEditingRole}
                        />
                      </ErrorPopover>
                    )}
                  />
                </li>

                <li className="flex flex-row items-center gap-2 text-sm">
                  <span className="flex-1">Update Role</span>

                  <Controller
                    control={control}
                    name="permissions.UpdateRole"
                    render={({field}) => (
                      <ErrorPopover
                        open={!!errors.permissions?.UpdateRole}
                        content={errors.permissions?.UpdateRole?.message}
                      >
                        <PermissionStatesPill
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!isEditingRole}
                        />
                      </ErrorPopover>
                    )}
                  />
                </li>

                <li className="flex flex-row items-center gap-2 text-sm">
                  <span className="flex-1">Delete Role</span>

                  <Controller
                    control={control}
                    name="permissions.DeleteRole"
                    render={({field}) => (
                      <ErrorPopover
                        open={!!errors.permissions?.DeleteRole}
                        content={errors.permissions?.DeleteRole?.message}
                      >
                        <PermissionStatesPill
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!isEditingRole}
                        />
                      </ErrorPopover>
                    )}
                  />
                </li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="channel" className="border-2 border-gray-600 rounded-md">
            <Accordion.Trigger className="text-left text-sm text-gray-300 cursor-pointer hover-highlight w-full p-2">
              Channel
            </Accordion.Trigger>

            <Accordion.Content className="border-t-2 border-t-gray-600">
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-2">
                <li className="flex flex-row items-center gap-2 text-sm">
                  <span className="flex-1">Create Channel</span>

                  <Controller
                    control={control}
                    name="permissions.CreateChannel"
                    render={({field}) => (
                      <ErrorPopover
                        open={!!errors.permissions?.CreateChannel}
                        content={errors.permissions?.CreateChannel?.message}
                      >
                        <PermissionStatesPill
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!isEditingRole}
                        />
                      </ErrorPopover>
                    )}
                  />
                </li>

                <li className="flex flex-row items-center gap-2 text-sm">
                <span className="flex-1">Delete Channel</span>

                <Controller
                  control={control}
                  name="permissions.DeleteChannel"
                  render={({field}) => (
                    <ErrorPopover
                      open={!!errors.permissions?.DeleteChannel}
                      content={errors.permissions?.DeleteChannel?.message}
                    >
                      <PermissionStatesPill
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!isEditingRole}
                      />
                    </ErrorPopover>
                  )}
                />
              </li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </section>

      {memberPermissions.effectivePermissions.DeleteRole && isEditable && role.specialRoleType === SpecialRoleType.None && !isEditingRole && (
        <div className="flex flex-row justify-end">
          <button
            type="button"
            className="button-theme-danger p-2 rounded-md cursor-pointer ml-auto mt-2"
            onClick={handleDeleteRole}
          >
            Delete Role
          </button>
        </div>
      )}
    </form>
  );
}