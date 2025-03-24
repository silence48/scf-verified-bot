"use client";

//import type { Badge, MemberInfo } from "@/types/guild";
import type { MemberInfo, TransactionBadge } from "@/types/discord-bot";
//import type { BadgeAsset } from "@/types/discord-bot";
import { formatDate, getRoleDotColor } from "@/lib/utils";
import { Badge as UIBadge } from "@/components/ui";
import Image from "next/image";
interface UserExpandedRowProps {
  user: MemberInfo;
  userData: {
    badges: TransactionBadge[];
    nominations: {
      id: string;
      roleName: string;
      nominatedUser: string;
      status: string;
      date: Date;
      voteCount?: number;
    }[];
    votes: {
      id: string;
      threadId?: string;
      roleName: string;
      nominatedUser: string;
      date: Date;
    }[];
    logs?: {
      timestamp: string;
      status: number;
      message?: string;
      error?: string;
      role?: string;
    }[];
  };
}

export function UserExpandedRow({ user, userData }: UserExpandedRowProps) {
  const { badges = [], nominations = [], votes = [], logs = [] } = userData;

  // Check if user has Navigator or Pilot role
  const hasHighTierRole = user.roles.some((role) => role.shortname === "Navigator" || role.shortname === "Pilot");

  return (
    <tr className="user-table-expanded-row">
      <td colSpan={5} className="user-table-expanded-cell">
        <div className="space-y-4 text-sm text-gray-300">
          <div className="user-table-detail-box">
            <h3 className="user-table-section-title">Profile Description</h3>
            <p>{user.profileDescription || "No profile description available."}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Community Information Section */}
            <div className="user-table-detail-box">
              <h3 className="user-table-section-title mb-3 rounded-t-md border-b border-gray-800/40 bg-[#12141e]/60 p-2">Community Information</h3>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="user-table-label w-48">Joined Stellar Developers:</span>
                  <UIBadge className="mt-1 bg-blue-500/20 text-blue-400 sm:mt-0">{formatDate(user.joinedStellarDevelopers)}</UIBadge>
                </div>
                {user.memberSince && (
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <span className="user-table-label w-48">Member Since:</span>
                    <UIBadge className="mt-1 bg-green-500/20 text-green-400 sm:mt-0">{formatDate(user.memberSince)}</UIBadge>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="user-table-label w-48">Joined Discord:</span>
                  <UIBadge className="mt-1 bg-purple-500/20 text-purple-400 sm:mt-0">{formatDate(user.joinedDiscord)}</UIBadge>
                </div>
              </div>
            </div>

            {/* Role History Section */}
            <div className="user-table-detail-box">
              <h3 className="user-table-section-title mb-3 rounded-t-md border-b border-gray-800/40 bg-[#12141e]/60 p-2">Role History</h3>
              <div className="space-y-2">
                {user.roles.map((role, idx) => (
                  <div key={`role-${idx}`} className="flex flex-col sm:flex-row sm:items-center">
                    <div className="flex w-48 items-center gap-2">
                      <span className={getRoleDotColor(role.shortname)}>●</span>
                      <span className="font-medium">{role.name}:</span>
                    </div>
                    {role.obtained && <UIBadge className="mt-1 bg-[#12141e]/60 text-gray-300 sm:mt-0">Obtained on {formatDate(role.obtained)}</UIBadge>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Registration Logs Section */}
          {logs && logs.length > 0 && (
            <div className="user-table-detail-box">
              <h3 className="user-table-section-title mb-3 rounded-t-md border-b border-gray-800/40 bg-[#12141e]/60 p-2">Registration Logs</h3>
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={`log-${index}`} className="rounded-md bg-[#0c0e14]/80 p-3">
                    <div className="flex justify-between">
                      <div>
                        <span className="font-medium text-white/90">Status: </span>
                        <UIBadge className={log.status === 200 ? "bg-green-500/20 text-green-400" : log.status === 406 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}>
                          {log.status}
                        </UIBadge>
                      </div>
                      <div className="text-xs text-gray-400">{log.timestamp ? formatDate(log.timestamp) : "Unknown date"}</div>
                    </div>
                    {log.error && (
                      <div className="mt-1">
                        <span className="text-gray-400">Error: </span>
                        <span className="text-red-400">{log.error}</span>
                      </div>
                    )}
                    {log.message && (
                      <div className="mt-1">
                        <span className="text-gray-400">Message: </span>
                        <span className="text-green-400">{log.message}</span>
                      </div>
                    )}
                    {log.role && (
                      <div className="mt-1">
                        <span className="text-gray-400">Role: </span>
                        <span
                          className={
                            log.role === "notfunded"
                              ? "text-red-400"
                              : log.role === "Verified"
                                ? "text-emerald-400"
                                : log.role === "Pathfinder"
                                  ? "text-blue-400"
                                  : log.role === "Navigator"
                                    ? "text-indigo-400"
                                    : log.role === "Pilot"
                                      ? "text-purple-400"
                                      : "text-gray-400"
                          }
                        >
                          {log.role}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Badges Section */}
          <div className="user-table-detail-box">
            <h3 className="user-table-section-title mb-3 rounded-t-md border-b border-gray-800/40 bg-[#12141e]/60 p-2">Badges</h3>
            {badges.length > 0 ? (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {badges.map((badge, badgeIndex) => (
                  <div key={`badge-${badgeIndex}-${badge._id || badgeIndex}`} className="flex items-center gap-2 rounded-md bg-[#0c0e14]/80 p-2">
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden">
                      <Image src={badge.image} alt={badge.code} width={120} height={120} className="h-full w-full rounded object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white/90">{badge.code || "Badge"}</div>
                      <div className="truncate text-xs text-gray-400">{badge.category_broad || ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No badges earned yet.</p>
            )}
          </div>

          {/* Nomination Information for Navigator/Pilot */}
          {hasHighTierRole && (
            <div className="user-table-detail-box">
              <h3 className="user-table-section-title mb-3 rounded-t-md border-b border-gray-800/40 bg-[#12141e]/60 p-2">Nomination Information</h3>
              <div className="space-y-2">
                {user.roles
                  .filter((role) => role.shortname === "Navigator" || role.shortname === "Pilot")
                  .map((role, idx) => (
                    <div key={`nomination-${idx}`} className="rounded-md bg-[#12141e]/40 p-3">
                      <p>
                        <span className="user-table-label">Role:</span> <span className={getRoleDotColor(role.shortname)}>●</span> {role.name}
                      </p>
                      <p>
                        <span className="user-table-label">Nominated by:</span> Admin
                      </p>
                      <p>
                        <span className="user-table-label">Votes received:</span> {role.shortname === "Navigator" ? "5" : "7"}
                      </p>
                      <p>
                        <span className="user-table-label">Status:</span> <span className="text-green-400">Approved</span>
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* User's Nominations */}
          <div className="user-table-detail-box">
            <h3 className="user-table-section-title mb-3 rounded-t-md border-b border-gray-800/40 bg-[#12141e]/60 p-2">Nominations Made</h3>
            {nominations.length > 0 ? (
              <div className="space-y-2">
                {nominations.map((nom, nomIndex) => (
                  <div key={`nomination-made-${nomIndex}-${nom.id || nomIndex}`} className="flex items-center justify-between rounded-md bg-[#0c0e14]/80 p-2">
                    <div>
                      <p>
                        <span className="font-medium text-white/90">{nom.nominatedUser}</span> for <span className="text-blue-400">{nom.roleName}</span>
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(nom.date)}</p>
                    </div>
                    <UIBadge className={nom.status === "approved" ? "bg-green-500/20 text-green-400" : nom.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}>
                      {nom.status}
                    </UIBadge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No nominations made.</p>
            )}
          </div>

          {/* User's Votes */}
          <div className="user-table-detail-box">
            <h3 className="user-table-section-title mb-3 rounded-t-md border-b border-gray-800/40 bg-[#12141e]/60 p-2">Votes Cast</h3>
            {votes.length > 0 ? (
              <div className="space-y-2">
                {votes.map((vote, voteIndex) => (
                  <div key={`vote-${voteIndex}-${vote.id || voteIndex}`} className="rounded-md bg-[#0c0e14]/80 p-2">
                    <p>
                      Voted for <span className="font-medium text-white/90">{vote.nominatedUser}</span> to become <span className="text-blue-400">{vote.roleName}</span>
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(vote.date)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No votes cast.</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
