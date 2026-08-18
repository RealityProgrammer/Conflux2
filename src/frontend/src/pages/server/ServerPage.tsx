import {Outlet, useLoaderData} from "react-router";

export default function ServerPage() {
  const channelId: string | undefined = useLoaderData();

  return (
    <div className="size-full flex flex-row">
      <Sidebar/>

      <div className="flex-1 overflow-auto">
        {channelId ? (
          <Outlet/>
        ) : (
          <div className="size-full flex flex-row justify-center items-center">
            <span className="select-none text-gray-600">...</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Sidebar() {
  const channelId: string | undefined = useLoaderData();

  return (
    <aside
      className="flex-none basis-64 px-1.5 pt-1.5 h-full bg-gray-725 border-r-2 border-r-gray-600 text-white overflow-y-auto flex flex-col overflow-hidden"
    >
      {channelId ? (
        <>
        </>
      ) : (
        <div className="size-full flex flex-row justify-center items-center">
          <span className="select-none text-gray-600">It's quiet around here...</span>
        </div>
      )}
    </aside>
  );
}