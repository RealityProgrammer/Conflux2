import {useLoaderData, useParams} from "react-router";
import {useDocumentTitle} from "usehooks-ts";

export default function DirectMessagePage() {
    useDocumentTitle("DM - Conflux");

    const { userId, channelId } = useLoaderData();

    if (!userId) {
        return (
            <div className="bg-gray-700 size-full flex flex-col justify-center items-center">
                <h1 className="font-normal font-bold text-gray-500 select-none">It is a wasted barren here...</h1>
            </div>
        );
    }

    if (!channelId) {
        return (
            <div className="bg-gray-700 size-full flex flex-col justify-center items-center">
                <h1 className="font-normal font-bold text-gray-500 select-none">But nobody came...</h1>
            </div>
        );
    }

    return (
        <div className="bg-gray-700 size-full flex flex-col justify-center items-center">
            <h1 className="text-4xl font-bold text-white select-none">This is DM</h1>
            <h1 className="font-normal text-gray-500 select-none">UserID: {userId}</h1>
            <h1 className="font-normal text-gray-500 select-none">ChannelID: {channelId}</h1>
        </div>
    );
}