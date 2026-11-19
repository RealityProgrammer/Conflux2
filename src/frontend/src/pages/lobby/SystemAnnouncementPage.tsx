import { useDocumentTitle } from "usehooks-ts";

export default function SystemAnnouncementPage() {
  useDocumentTitle("Conflux - Announcements");

  return (
    <div className="flex size-full flex-col items-center justify-center bg-gray-700">
      <h1 className="text-4xl font-bold text-white select-none">This is announcement page</h1>
      <h1 className="font-normal text-gray-500 select-none">
        Yea nothing interesting happen here, carry on
      </h1>
    </div>
  );
}
