import {
  type GetServerModerationLogsQuery,
  useInfiniteGetServerModerationLogsQuery
} from "../../graphql/infiniteQueries.ts";
import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {useTable, tableFeatures, type ColumnDef, flexRender, columnSizingFeature, columnResizingFeature} from "@tanstack/react-table";
import {useEffect, useRef} from "react";
import {useVirtualizer} from "@tanstack/react-virtual";
import DateTimeText from "../DateTimeText.tsx";
import {parse as parseDuration} from "iso8601-duration";
import {BiInfinite} from "react-icons/bi";
import UserAvatar from "../UserAvatar.tsx";

type LogElement = NonNullable<GetServerModerationLogsQuery["serverModerationLogs"]["nodes"]>[number];

export default function ModerationLog() {
  return (
    <>
      <header className="flex-none mb-0">
        <h3 className="text-xl font-bold text-white">Moderation Log</h3>
        <p className="text-sm text-gray-400">
          Hall of fame or Wall of shame, but for moderators.
        </p>
      </header>

      <div className="flex-1 flex gap-2 min-h-0 overflow-hidden">
        <LogTable/>
      </div>
    </>
  )
}

const durationFormatter = new Intl.DurationFormat(navigator.language, {
  style: "narrow",
})

const features = tableFeatures({
  columnSizingFeature,
  columnResizingFeature,
});

const logTableColumns: Array<ColumnDef<typeof features, LogElement>> = [
  {
    accessorFn: (row) => row.executorMember?.user,
    header: "Executor",
    cell: (info) => {
      const executor: NonNullable<LogElement["executorMember"]>["user"] | null = info.getValue() as any;
      
      if (!executor) {
        return "Unknown";
      }
      
      return (
        <span className="flex flex-row justify-center items-center gap-2">
          <UserAvatar
            hasAvatar={executor.hasAvatar}
            userId={executor.id}
            className="size-6 overflow-hidden rounded-full hidden lg:inline"
          />

          {executor.displayName}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: (info) => (
      <span className="select-none block text-center">{info.getValue<string>()}</span>
    ),
    size: 40,
  },
  {
    accessorFn: (row) => row.affectedMember?.user,
    header: "Affected",
    cell: (info) => {
      const affected: NonNullable<LogElement["affectedMember"]>["user"] | null = info.getValue() as any;

      if (!affected) {
        return "Unknown";
      }

      return (
        <span className="flex flex-row justify-center items-center gap-2">
          <UserAvatar
            hasAvatar={affected.hasAvatar}
            userId={affected.id}
            className="size-6 overflow-hidden rounded-full hidden lg:inline"
          />

          {affected.displayName ?? "??"}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: (info) => {
      const value = info.getValue<string>();

      if (!value || value.length === 0) {
        return "\u{2212}";
      }

      return <span className="block w-full">{value}</span>;
    },
    size: 160,
  },
  {
    accessorKey: "banDuration",
    header: "Duration",
    cell: (info) => {
      const value = info.getValue<string>();

      if (!value || value.length == 0) {
        return "\u{2212}";
      }

      if (value == "P9999999DT23H59M59S") {
        return (
          <div className="size-full flex justify-center items-center">
            <BiInfinite className="size-5"/>
          </div>
        )
      }

      const parsedDuration = parseDuration(value);
      return durationFormatter.format(parsedDuration);
    },
    size: 80,
  },
  {
    accessorKey: "createdAt",
    header: "Time",
    cell: (info) => (<DateTimeText value={new Date(info.getValue<string>())}/>),
    enableResizing: false,
    size: 100,
  }
];

function LogTable() {
  const { serverId } = useCommunityServerContext();

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteGetServerModerationLogsQuery({ serverId, after: null }, {
    initialPageParam: { after: null },
    getNextPageParam: (lastPage: GetServerModerationLogsQuery): { after: string } | undefined => {
      const pageInfo = lastPage?.serverModerationLogs?.pageInfo;

      if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
        return { after: pageInfo.endCursor };
      }

      return undefined;
    },
    staleTime: 15 * 60 * 1000,
  });

  const allElements: LogElement[] = data?.pages.flatMap((page: GetServerModerationLogsQuery): LogElement[] => page?.serverModerationLogs?.nodes ?? []) ?? [];

  const table = useTable({
    features,
    columns: logTableColumns,
    data: allElements,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
  });

  const { rows } = table.getRowModel();

  const containerRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: allElements.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= allElements.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [virtualItems, allElements.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full overflow-auto rounded-lg border-2 border-gray-600 bg-gray-675 shadow-xl scrollbar-none"
    >
      <table
        className="table-fixed text-sm text-center border-separate border-spacing-0 min-w-full"
        style={{ width: table.getTotalSize() }}
      >
        <thead className="bg-gray-750 shadow-md">
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="sticky top-0 z-10 bg-gray-750 py-3 font-semibold text-gray-200 whitespace-nowrap"
                style={{ width: header.getSize() }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}

                {header.column.getCanResize() && (
                  <div
                    onDoubleClick={() => header.column.resetSize()}
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={`h-full absolute right-0 top-0 w-0.75 cursor-col-resize select-none touch-none ${
                      header.column.getIsResizing()
                        ? "bg-gray-500"
                        : "bg-gray-600"
                    }`}
                  />
                )}
              </th>
            ))}
          </tr>
        ))}
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr><td className="p-0 m-0 border-none" style={{ height: `${paddingTop}px` }} colSpan={logTableColumns.length} /></tr>
          )}

          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];

            const isEven = virtualRow.index % 2 === 0;
            const bgClass = isEven ? 'bg-none' : 'bg-white/5';

            return (
              <tr
                key={row.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={`${bgClass} hover-highlight border-none m-0 p-0`}
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="py-3 align-middle text-center">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}

          {paddingBottom > 0 && (
            <tr><td className="p-0 m-0 border-none" style={{ height: `${paddingBottom}px` }} colSpan={logTableColumns.length} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}