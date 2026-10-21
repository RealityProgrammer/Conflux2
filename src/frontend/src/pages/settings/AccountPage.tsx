import {Separator} from "radix-ui";
import {BsPhone} from "react-icons/bs";
import DateTimeText from "../../components/DateTimeText.tsx";
import {useQuery} from "@tanstack/react-query";

export default function AccountPage() {
  return (
    <>
      <h1 className="font-bold text-2xl">Account</h1>
      <p className="text-gray-400 text-sm">Peak OPSEC happen here.</p>

      <Separator.Root className="horizontal-separator my-2"/>

      <h2 className="font-semibold text-xl">Account Login Sessions</h2>
      <p className="text-gray-400 text-sm">Here are the history of login of this account. Take a good look at it and remove any suspicious session.</p>
      
      <AccountSessions/>
    </>
  );
}

function AccountSessions() {
  return (
    <div className="flex flex-row justify-center items-center">
      <div className="w-2xl border-2 border-gray-600 rounded-lg mt-2 bg-black/10 h-96 overflow-y-scroll">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="p-1 flex flex-row justify-center items-center gap-2 hover-highlight">
            <BsPhone className="flex-none size-8 fill-white"/>
            
            <div className="flex-1">
              <p>le phone</p>
              <p className="text-sm text-gray-400">Last activity: <DateTimeText value={new Date()}/> </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}