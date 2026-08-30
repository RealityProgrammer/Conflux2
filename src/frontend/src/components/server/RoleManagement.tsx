import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {
  type GetServerRolesByServerIdQuery,
  useInfiniteGetServerRolesByServerIdQuery
} from "../../graphql/infiniteQueries.ts";
import {type ReactNode, useState} from "react";
import {BsCircleFill, BsPlusLg} from "react-icons/bs";
import VirtualizedScrollList from "../VirtualizedScrollList.tsx";
import UserAvatar from "../UserAvatar.tsx";
import DateTimeText from "../DateTimeText.tsx";
import {ServerPermission} from "../../api/schema.ts";
import PermissionStatesPill from "./PermissionStatesPill.tsx";
import {Separator} from "radix-ui";

type RoleDisplayElement = NonNullable<NonNullable<GetServerRolesByServerIdQuery["communityServerRolesByServerId"]>["nodes"]>[number];

const REPRESENTATION_COLORS = [
  "#2f88ff",
  "#8457a5",
  "#668534",
  "#80ef17",
  "#fd5e42",
  "#d20404",
  "#0f097a",
  "#f172b9",
  "#d6e4e2",
  "#0a5eef",
  "#f81ac1",
];

export default function RoleManagement() {
  const { serverId } = useCommunityServerContext();

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = useInfiniteGetServerRolesByServerIdQuery({
    serverId,
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

  const allRoles: RoleDisplayElement[] =
    data?.pages.flatMap((page: GetServerRolesByServerIdQuery): RoleDisplayElement[] => page?.communityServerRolesByServerId?.nodes ?? []) ?? [];

  // fake representation color
  const generateRepresentationColor = (): string => {
    const rand = Math.floor(Math.random() * REPRESENTATION_COLORS.length);
    return REPRESENTATION_COLORS[rand];
  };

  const [selectedRole, setSelectedRole] = useState<RoleDisplayElement | undefined>();

  return (
    <>
      <header className="flex-none mb-3">
        <h3 className="text-xl font-bold text-white">Role Management</h3>
        <p className="text-sm text-gray-400">
          Where power trips are just a click away. Handle with care (or don't, we're not your mom).
        </p>
      </header>

      <div className="flex-1 flex gap-2 min-h-0">
        <section className="w-64 flex flex-col bg-gray-700 rounded-lg border-2 border-gray-600">
          <div className="flex flex-row items-center gap-1 pb-2 border-b-2 border-b-gray-600 p-2">
            <input
              type="text"
              // value={newRoleName}
              // onChange={(e) => setNewRoleName(e.target.value)}
              // onKeyDown={(e) => e.key === 'Enter' && handleCreateRole()}
              placeholder="New role name"
              className="flex-1 input-field h-8 text-sm min-w-0"
            />

            <button
              // onClick={handleCreateRole}
              className="flex-none p-1.5 button-theme-primary rounded cursor-pointer"
              title="Create role"
            >
              <BsPlusLg className="w-4 h-4" />
            </button>
          </div>

          <VirtualizedScrollList
            itemCount={allRoles.length}
            isLoading={isLoading}
            estimateSize={() => 36}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={() => {
              fetchNextPage();
            }}
            renderItem={(itemIndex) => {
              const role: RoleDisplayElement = allRoles[itemIndex];
              const representationColor = generateRepresentationColor();

              return (
                <button
                  className="w-full flex flex-row text-left items-center hover-highlight gap-2 px-2 cursor-pointer"
                  onClick={() => {
                    setSelectedRole(role);
                  }}
                >
                  <BsCircleFill className="flex-none size-3" style={{fill: representationColor}}/>

                  <span className="flex-1 truncate">{role.name}</span>
                  <span className="flex-none truncate text-gray-500 text-xs">{role.numMembers}</span>
                </button>
              )
            }}
            hideVerticalScrollbar={true}
          />
        </section>

        <section className="flex-1 bg-gray-700 rounded-lg p-3 overflow-y-auto border-gray-600 border-2 space-y-2">
          {selectedRole ? (
            <>
              <header className="flex items-center space-x-2">
                <h4 className="text-xl font-semibold text-white">{selectedRole.name}</h4>

                <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                  {selectedRole.numMembers} members
                </span>
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
                        userId={selectedRole.creatorUser?.id}
                        hasAvatar={selectedRole.creatorUser?.hasAvatar ?? false}
                        className="size-5 rounded-full overflow-hidden"
                      />

                      <span className="text-sm font-medium text-zinc-200">
                        {selectedRole.creatorUser?.displayName ?? "Deleted User"}
                      </span>

                      <span className="text-xs text-zinc-500 ml-1 border-l border-zinc-700 pl-2">
                        <DateTimeText value={new Date(selectedRole.createdAt)} />
                      </span>
                    </div>
                  </div>

                  <Separator.Root className="horizontal-separator my-3" />

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-300">Authorize Level</span>

                    <span className="text-sm font-mono text-zinc-300 px-2.5 py-1 rounded border border-zinc-700/50">
                      {selectedRole.authorizeLevel}
                    </span>
                  </div>

                  <Separator.Root className="horizontal-separator my-3" />

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-300">Special Role</span>

                    <span className="text-sm font-medium text-zinc-300 px-2.5 py-1 rounded border border-zinc-700/50">
                      {selectedRole.specialRoleType}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Permissions
                </h4>

                <PermissionGroup
                  text="Role"
                >
                  <li className="flex flex-row items-center gap-2 text-sm">
                    <span className="flex-1">Create Role</span>

                    <PermissionStatesPill
                      value={selectedRole.permissions.find(p => p.permission == ServerPermission.CreateRole)?.state}
                    />
                  </li>

                  <li className="flex flex-row items-center gap-2 text-sm">
                    <span className="flex-1">Update Role</span>

                    <PermissionStatesPill
                      value={selectedRole.permissions.find(p => p.permission == ServerPermission.UpdateRole)?.state}
                    />
                  </li>

                  <li className="flex flex-row items-center gap-2 text-sm">
                    <span className="flex-1">Delete Role</span>

                    <PermissionStatesPill
                      value={selectedRole.permissions.find(p => p.permission == ServerPermission.DeleteRole)?.state}
                    />
                  </li>
                </PermissionGroup>

                <PermissionGroup
                  text="Channel"
                >
                  <li className="flex flex-row items-center gap-2 text-sm">
                    <span className="flex-1">Create Channel</span>

                    <PermissionStatesPill
                      value={selectedRole.permissions.find(p => p.permission == ServerPermission.CreateChannel)?.state}
                    />
                  </li>

                  <li className="flex flex-row items-center gap-2 text-sm">
                    <span className="flex-1">Delete Channel</span>

                    <PermissionStatesPill
                      value={selectedRole.permissions.find(p => p.permission == ServerPermission.DeleteChannel)?.state}
                    />
                  </li>
                </PermissionGroup>
              </section>

              <button className="button-theme-danger p-2 rounded-md cursor-pointer float-right">
                Delete Role
              </button>
            </>
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

function PermissionGroup({
  text,
  children
}: {text: string; children: ReactNode}) {
  const [open, setOpen] = useState(false);

  return (
    <ul className="border-2 border-gray-600 rounded-md">
      <button className={`text-left text-sm text-gray-300 cursor-pointer hover-highlight w-full p-2 ${open ? "border-b-2 border-b-gray-600" : ""}`} onClick={() => setOpen(!open)}>
        {text}
      </button>

      {open && (
        <div className="grid grid-cols-4 gap-2 p-2">
          {children}
        </div>
      )}
    </ul>
  );
}