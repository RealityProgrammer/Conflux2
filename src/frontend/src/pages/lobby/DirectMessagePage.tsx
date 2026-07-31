import {useLoaderData, useParams} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import IconButton from "../../components/IconButton.tsx";
import {BsPaperclip, BsSend} from "react-icons/bs";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";

export default function DirectMessagePage() {
    useDocumentTitle("DM - Conflux");

    const { userId, channelId } = useLoaderData();
    
    return (
        <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
            <header className="flex-none basis-10 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2">
                Channel {channelId}
            </header>

            <VirtualizedScrollList
                className="flex-1 min-h-0"
                items={[]}
                isLoading={false}
                estimateSize={52}
                hasNextPage={false}
                isFetchingNextPage={false}
                fetchNextPage={() => {}}
                renderEmpty={() => (
                    <div className="flex flex-1 select-none justify-center items-end text-gray-300 pb-3">
                        And our story begin...
                    </div>
                )}
                renderItem={(item) => {
                    return (
                        <p>Value {item}</p>
                    );
                }}/>

            <footer className="flex-none px-2 py-1 border-t-2 border-t-gray-600 flex flex-row items-center gap-2">
                <IconButton isLoading={false} className="size-6 flex-none">
                    <BsPaperclip className="size-6"/>
                </IconButton>

                <input className="input-field h-10 w-full flex-1" placeholder="Message body goes here"/>

                <IconButton isLoading={false} className="size-6 flex-none">
                    <BsSend className="size-6"/>
                </IconButton>
            </footer>
        </div>
    );

    // if (!userId) {
    //     return (
    //         <div className="bg-gray-700 size-full flex flex-col justify-center items-center">
    //             <h1 className="font-normal font-bold text-gray-500 select-none">It is a wasted barren here...</h1>
    //         </div>
    //     );
    // }
    //
    // if (!channelId) {
    //     return (
    //         <div className="bg-gray-700 size-full flex flex-col justify-center items-center">
    //             <h1 className="font-normal font-bold text-gray-500 select-none">But nobody came...</h1>
    //         </div>
    //     );
    // }
    //
    // return (
    //     <div className="bg-gray-700 size-full flex flex-col justify-center items-center">
    //         <h1 className="text-4xl font-bold text-white select-none">This is DM</h1>
    //         <h1 className="font-normal text-gray-500 select-none">UserID: {userId}</h1>
    //         <h1 className="font-normal text-gray-500 select-none">ChannelID: {channelId}</h1>
    //     </div>
    // );
}