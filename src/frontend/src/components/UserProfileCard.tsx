// import type {HTMLAttributes} from "react";
// import UserAvatar from "./UserAvatar.tsx";
//
// interface UserProfileCardProps extends HTMLAttributes<HTMLDivElement> {
//     userId: string;
//     username: string;
//     displayName: string;
//     hasAvatar?: boolean;
//     bannerUrl?: string;
//     // Fallback background color if they don't have a banner image
//     fallbackBannerColor?: string;
// }
//
// export default function UserProfileCard({
//     userId,
//     username,
//     displayName,
//     hasAvatar,
//     bannerUrl,
//     fallbackBannerColor = "bg-indigo-500",
//     className = "",
//     ...props
// }: UserProfileCardProps) {
//     return (
//         <div
//             className={`w-[340px] overflow-hidden rounded-2xl bg-zinc-900 shadow-xl ${className}`}
//             {...props}
//         >
//             {/* Banner Section */}
//             <div className="relative h-[120px] w-full">
//                 {bannerUrl ? (
//                     <img
//                         src={bannerUrl}
//                         alt={`${displayName}'s banner`}
//                         className="h-full w-full object-cover"
//                     />
//                 ) : (
//                     <div className={`h-full w-full ${fallbackBannerColor}`} />
//                 )}
//
//                 <div className="absolute -bottom-10 left-4 rounded-full bg-zinc-900 p-[6px]">
//                     <UserAvatar
//                         userId={userId}
//                         hasAvatar={hasAvatar}
//                         // Passing dimensions directly to Radix Root via your spread props
//                         className="h-[84px] w-[84px] rounded-full"
//                     />
//                 </div>
//             </div>
//
//             {/* User Info Section */}
//             <div className="px-4 pb-6 pt-12">
//                 <div className="flex flex-col">
//                     <span className="text-xl font-bold leading-tight text-gray-50">
//                         {displayName}
//                     </span>
//                     <span className="text-sm font-medium text-gray-400">
//                         {username}
//                     </span>
//                 </div>
//
//                 {/* Optional: Add custom status or badges down here later */}
//                 <hr className="my-4 border-zinc-800" />
//
//                 <div className="text-sm font-semibold uppercase text-zinc-400">
//                     About Me
//                 </div>
//                 <p className="mt-2 text-sm text-zinc-300">
//                     Custom user bio would go here...
//                 </p>
//             </div>
//         </div>
//     );
// }