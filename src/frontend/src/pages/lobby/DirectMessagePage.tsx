import {useLoaderData, useParams} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import IconButton from "../../components/IconButton.tsx";
import {BsPaperclip, BsSend} from "react-icons/bs";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import ChatInput, {type ChatInputMessageState} from "../../components/ChatInput.tsx";
import {messagingService} from "../../api/messagingService.ts";

export default function DirectMessagePage() {
    useDocumentTitle("DM - Conflux");

    const { channelId, channelSummary }: DirectMessagePageLoaderProps = useLoaderData();

    const handleSendMessage = async (messagePayload: ChatInputMessageState) => {
        if (!channelId) return;

        await messagingService.sendMessage(channelId, messagePayload.messageBody, messagePayload.attachments);
    };

    return (
        <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
            <header className="flex-none basis-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2">
                {!!channelId && !!channelSummary ? (
                    <>
                        <UserAvatar hasAvatar={channelSummary.otherUser.hasAvatar}
                                    className="size-8 overflow-hidden rounded-full"/>

                        <p>{channelSummary.otherUser.userName}</p>
                    </>
                ) : (
                    <p>But nobody came...</p>
                )}
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

            <ChatInput disabled={!channelId || !channelSummary}
                       onSendMessage={handleSendMessage}/>
        </div>
    );
}