import {Virtuoso} from "react-virtuoso";
import type {ReactNode} from "react";
import Spinner from "./Spinner.tsx";

interface VirtualizedScrollList2Props<ItemData> {
  totalCount?: number;
  data?: ItemData[];
  className?: string;
  renderEmpty?: () => ReactNode;
  renderItem: (index: number, data?: ItemData) => ReactNode;
  overscan?: number;
  atBottomThreshold?: number;
  computeItemKey: (index: number) => string;
  endReached?: (index: number) => void;
  showTopLoader?: boolean;
  showBottomLoader?: boolean;
}

export default function VirtualizedScrollList2<ItemData>({
  totalCount,
  data,
  className,
  renderEmpty,
  renderItem,
  overscan,
  atBottomThreshold,
  computeItemKey,
  endReached,
  showTopLoader,
  showBottomLoader,
}: VirtualizedScrollList2Props<ItemData>) {
  return (
    <div className="relative size-full">
      <div className={`pointer-events-none z-10 absolute top-2 left-1/2 -translate-x-1/2 bg-gray-750 p-2 rounded-md transition-all duration-200 ease-out ${
        showTopLoader ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}>
        <Spinner className="size-6 fill-white" />
      </div>
      
      <Virtuoso
        className={className}
        totalCount={totalCount}
        data={data}
        computeItemKey={computeItemKey}
        components={{
          EmptyPlaceholder: renderEmpty,
        }}
        itemContent={renderItem}
        overscan={overscan}
        atBottomThreshold={atBottomThreshold}
        alignToBottom={false}
        endReached={endReached}
      />
      
      <div className={`pointer-events-none z-10 absolute bottom-2 left-1/2 -translate-x-1/2 bg-gray-750 p-2 rounded-md transition-all duration-200 ease-out ${
        showBottomLoader ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}>
        <Spinner className="size-6 fill-white"/>
      </div>
    </div>
  )
}