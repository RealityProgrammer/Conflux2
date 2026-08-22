import ServerSidebar from "../../components/server/ServerSidebar.tsx";

export default function ServerPage() {
  return (
    <div className="size-full flex flex-row">
      <ServerSidebar/>

      <div className="flex-1 overflow-auto flex flex-row justify-center items-center">
      </div>
    </div>
  );
}