import {useParams} from "react-router";

export default function DirectMessagePage() {
    const params = useParams();
    const userId: string | undefined = params["userId"];

    if (!userId) {
        return (
            <div className="bg-gray-700 size-full flex flex-col justify-center items-center">
                <h1 className="text-4xl font-bold text-white select-none">It is a wasted barren here...</h1>
                <h1 className="font-normal text-gray-500 select-none">But nobody came...</h1>
            </div>
        );
    }

    return (
        <div className="bg-gray-700 size-full flex flex-col justify-center items-center">
            <h1 className="text-4xl font-bold text-white select-none">This is DM</h1>
            <h1 className="font-normal text-gray-500 select-none">DM with user with ID {userId} will happen here</h1>
        </div>
    );
}