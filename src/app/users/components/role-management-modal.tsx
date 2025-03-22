"use client";

import { useState, useEffect } from "react";
import type { BadgeAsset, MemberRole } from "@/types/discord-bot";
import type { TierRole } from "@/types/roles";
import { X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { getAllRoles, grantRole, revokeRole } from "@/actions/roles";

import { getAllBadges } from "@/actions/badges";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Portal } from "@/components/portal";

interface RoleManagementModalProps {
  userId: string;
  username: string;
  userRoles: MemberRole[];
  onClose: () => void;
}

export function RoleManagementModal({ userId, username, userRoles, onClose }: RoleManagementModalProps) {
  const [roles, setRoles] = useState<TierRole[]>([]);
  const [badges, setBadges] = useState<BadgeAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  // Fetch roles and badges
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [rolesData, badgesData] = await Promise.all([getAllRoles(), getAllBadges()]);
        setRoles(rolesData);
        setBadges(badgesData);
      } catch (err) {
        setError("Failed to load data. Please try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check if user has a specific role
  const hasRole = (roleTier: string) => {
    return userRoles.some((role) => role.shortname === roleTier);
  };

  // Handle granting a role
  const handleGrantRole = async (roleId: string, override = false) => {
    const role = roles.find((r) => r._id === roleId);
    if (!role) return;

    setConfirmationModal({
      isOpen: true,
      title: override ? "Override Role Requirements" : "Grant Role",
      message: override
        ? `Are you sure you want to grant the ${role.roleName} role to ${username}, bypassing the requirements?`
        : `Are you sure you want to grant the ${role.roleName} role to ${username}?`,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const result = await grantRole(roleId, userId, override);
          if (result.success) {
            // Update local state to reflect the change
            setError(null);
          } else {
            setError(result.message || "Failed to grant role");
          }
        } catch (err) {
          setError("An error occurred while granting the role");
          console.error(err);
        } finally {
          setIsLoading(false);
          setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handle revoking a role
  const handleRevokeRole = async (roleId: string) => {
    const role = roles.find((r) => r._id === roleId);
    if (!role) return;

    setConfirmationModal({
      isOpen: true,
      title: "Revoke Role",
      message: `Are you sure you want to revoke the ${role.roleName} role from ${username}?`,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const result = await revokeRole(roleId, userId);
          if (result.success) {
            // Update local state to reflect the change
            setError(null);
          } else {
            setError(result.message || "Failed to revoke role");
          }
        } catch (err) {
          setError("An error occurred while revoking the role");
          console.error(err);
        } finally {
          setIsLoading(false);
          setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Check if user is eligible for a role based on badges
  const isEligibleForRole = (role: TierRole): boolean => {
    // This would be a more complex check in a real implementation
    // For now, we'll just return true for Verified and Pathfinder roles
    return role.tier === "SCF Verified" || role.tier === "SCF Pathfinder";
  };

  return (
    <Portal>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999]"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
        }}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="fixed z-[9999] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1a1d29]/80 border border-gray-800/60 rounded-lg p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold tracking-wide text-white/90">Manage Roles for {username}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-gray-700/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="bg-destructive/20 text-destructive flex items-center gap-2 p-3 rounded-md mb-4">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Roles */}
              <div>
                <h3 className="text-lg font-medium text-white/90 mb-3">Current Roles</h3>
                <div className="grid gap-3">
                  {userRoles.length > 0 ? (
                    userRoles.map((memberRole, index) => (
                      <div
                        key={index}
                        className="bg-[#12141e]/40 p-3 rounded-lg border border-gray-800/40 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getRoleDotColorClass(memberRole.shortname)}`} />
                          <span>{memberRole.name}</span>
                          <span className="text-xs text-gray-400">
                            (since {new Date(memberRole.obtained).toLocaleDateString()})
                          </span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const roleObj = roles.find((r) => r.tier === memberRole.shortname);
                            if (roleObj) handleRevokeRole(roleObj._id);
                          }}
                          className="h-8"
                        >
                          Revoke
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">No roles assigned</p>
                  )}
                </div>
              </div>

              {/* Available Roles */}
              <div>
                <h3 className="text-lg font-medium text-white/90 mb-3">Available Roles</h3>
                <div className="grid gap-3">
                  {roles.map((role) => {
                    const alreadyHas = hasRole(role.tier);
                    const isEligible = isEligibleForRole(role);

                    return (
                      <div key={role._id} className="bg-[#12141e]/40 p-3 rounded-lg border border-gray-800/40">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getRoleDotColorClass(role.tier)}`} />
                              <span className="font-medium text-white/90">{role.roleName}</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{role.description}</p>
                          </div>
                          <div className="flex gap-2">
                            {alreadyHas ? (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                                <Check className="h-3 w-3" /> Assigned
                              </span>
                            ) : isEligible ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleGrantRole(role._id, false)}
                                className="h-8"
                              >
                                Grant Role
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGrantRole(role._id, true)}
                                  className="h-8 border-gray-700/50 bg-[#0c0e14]/80 hover:bg-[#1e2235]/80 hover:text-white"
                                >
                                  Override
                                </Button>
                                {role.nominationEnabled && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      // This would open the nomination modal
                                      console.log("Nominate for role:", role._id);
                                    }}
                                    className="h-8"
                                  >
                                    Nominate
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Requirements */}
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-white mb-2">Requirements</h4>

                          {/* If there are no groups at all */}
                          {!role.requirementGroups || role.requirementGroups.length === 0 ? (
                            <p className="text-sm text-gray-400">No requirements defined.</p>
                          ) : (
                            <div>
                              {/* Explain how groups combine (ANY_GROUP vs. ALL_GROUPS) */}
                              <p className="text-xs text-gray-400 italic mb-2">
                                {role.requirements === "ANY_GROUP"
                                  ? "User must satisfy ALL requirements in at least ONE group."
                                  : "User must satisfy ALL requirements in ALL groups."}
                              </p>

                              {role.requirementGroups.map((group, groupIdx) => (
                                <div key={groupIdx} className="bg-[#12141e]/40 p-2 rounded-md mb-2">
                                  <h5 className="text-sm font-medium text-white mb-1">
                                    {group.name || `Group ${groupIdx + 1}`}
                                    <span className="text-xs text-gray-400 ml-2">
                                      ({group.groupMode === "ALL" ? "All required" : "Any required"})
                                    </span>
                                  </h5>
                                  <ul className="list-disc pl-5 text-sm text-gray-400 space-y-1">
                                    {group.requirements.map((req, reqIdx) => (
                                      <li key={reqIdx}>
                                        {req.type === "Discord" && "Join Discord"}
                                        {req.type === "SocialVerification" && "Verify social account"}
                                        {req.type === "StellarAccount" && "Verify Stellar address"}
                                        {req.type === "BadgeCount" &&
                                          `${req.minCount} badges from ${req.badgeCategory || "any"} category`}
                                        {req.type === "ConcurrentRole" && `Have ${req.concurrentRoleName} role`}
                                        {req.type === "ExistingRole" && `Already have ${req.existingRole} role`}
                                        {req.type === "Nomination" &&
                                          `Get nominated and receive ${req.nominationRequiredCount} upvotes from ${req.eligibleVoterRoles?.join(" or ")
                                          }`}
                                        {req.type === "CommunityVote" &&
                                          `Participate in ${req.participationRounds} Community Vote round${req.participationRounds !== 1 ? "s" : ""
                                          }`}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>



                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
      />
    </Portal>
  );
}

// Helper function to get role dot color class
function getRoleDotColorClass(roleName: string): string {
  switch (roleName) {
    case "Navigator":
      return "bg-indigo-400";
    case "Pilot":
      return "bg-purple-400";
    case "Pathfinder":
      return "bg-blue-400";
    case "Verified":
      return "bg-emerald-400";
    default:
      return "bg-gray-400";
  }
}

