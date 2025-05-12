import { Avatar ,AvatarImage, AvatarFallback } from "@/components/ui";
import { MemberInfo, PrecomputedBadge } from "@/types/discord-bot";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";

// Member card component - reusing the MemberInfo type from discord-bot/types
export function MemberCard({ member, precomputedBadge }: { member: MemberInfo; precomputedBadge?: PrecomputedBadge }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/users?expandedUser=${member.discordId}`);
  };

  return (
    <div className="card-container flex h-full cursor-pointer flex-col transition-all hover:translate-y-[-2px] hover:shadow-lg" onClick={handleClick}>
      <div className="mb-3 flex items-center gap-3">
        <Avatar>
          <AvatarImage src={member.avatar || undefined} alt={member.username} />
          <AvatarFallback>
            {(() => {
              try {
                return member.username ? member.username.substring(0, 2).toUpperCase() : "??";
              } catch (error) {
                console.error(`Error generating avatar fallback for user: ${member}`, error);
                return "??";
              }
            })()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="card-title">{member.username}</h3>
          {precomputedBadge?.publicKey && (
            <div className="flex items-center gap-1">
              <span className="max-w-[120px] truncate text-xs text-gray-400">
                {precomputedBadge.publicKey.substring(0, 8)}...
                {precomputedBadge.publicKey.substring(precomputedBadge.publicKey.length - 8)}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://stellar.expert/explorer/public/account/${precomputedBadge.publicKey}`, "_blank");
                }}
                className="inline-flex cursor-pointer text-blue-400"
              >
                <ExternalLink size={12} />
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-3 flex-1">
        <h4 className="mb-2 text-sm font-medium text-white">Roles</h4>

        {member.roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {member.roles.map((role, index) => (
              <span key={index} className={`rounded-full px-2 py-0.5 text-xs badge-bg-${role.shortname.toLowerCase()}`}>
                {role.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No roles</p>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium text-white">Badges</h4>

        {precomputedBadge && precomputedBadge.badges.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {precomputedBadge.badges.slice(0, 3).map((badge, index) => (
              <div key={index} className="h-6 w-6 overflow-hidden rounded" title={badge.code}>
                <Image width={120} height={120} src={badge.image} alt={badge.code} className="h-full w-full object-cover" />
              </div>
            ))}
            {precomputedBadge.badges.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#12141e]/40 text-xs font-medium text-gray-400">+{precomputedBadge.badges.length - 3}</div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No badges</p>
        )}
      </div>
    </div>
  );
}