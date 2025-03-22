"use client";

import { useState, useEffect } from "react";
import {
  createRole,
  updateRole,
  deleteRole,
  nominateForRole,
  createVotingThread,
  getAllRoles,
} from "@/actions/roles";
import type { TierRole as Role, RoleTier } from "@/types/roles";
import type { BadgeAsset as Badge } from "@/discord-bot/types";
import { getAllBadges } from "@/actions/badges";
import { AlertCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui";
import { RoleCard } from "./components/role-card";
import { RoleForm } from "./components/role-form";
import { NominationForm } from "./components/nomination-form";
import { ConfirmationModal } from "@/components/ConfirmationModal";

// Main component
export default function ManageRolesClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [nominatingRole, setNominatingRole] = useState<Role | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    roleId: string | null
  }>({ isOpen: false, roleId: null });

  // Fetch roles and badges on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch roles
        const rolesData = await getAllRoles();

        // Fetch badges
        const badgesData = await getAllBadges();

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

  // Filter roles based on search text
  const filteredRoles = roles.filter(
    (role) =>
      role.roleName.toLowerCase().includes(searchText.toLowerCase()) ||
      role.description.toLowerCase().includes(searchText.toLowerCase()) ||
      role.tier.toLowerCase().includes(searchText.toLowerCase()),
  );

  // Group roles by tier
  const groupedRoles = filteredRoles.reduce(
    (acc: Record<RoleTier, Role[]>, role) => {
      if (!acc[role.tier]) {
        acc[role.tier] = [];
      }
      acc[role.tier].push(role);
      return acc;
    },
    {} as Record<RoleTier, Role[]>,
  );

  // Sort tiers in specific order
  const tierOrder: RoleTier[] = ["SCF Pilot", "SCF Navigator", "SCF Pathfinder", "SCF Verified"];

  // Handle role creation
  const handleCreateRole = async (role: Role) => {
    try {
      setIsLoading(true);
      const newRole = await createRole(role);
      setRoles([...roles, newRole]);
      setIsFormOpen(false);
      setEditingRole(null);
    } catch (err) {
      setError("Failed to create role. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role update
  const handleUpdateRole = async (role: Role) => {
    try {
      setIsLoading(true);
      const updatedRole = await updateRole(role);
      setRoles(roles.map((r) => (r._id === updatedRole._id ? updatedRole : r)));
      setEditingRole(null);
    } catch (err) {
      setError("Failed to update role. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role deletion
  const handleDeleteRole = async (roleId: string) => {
    try {
      setIsLoading(true);
      await deleteRole(roleId);
      setRoles(roles.filter((role) => role._id !== roleId));
      setDeleteConfirmation({ isOpen: false, roleId: null });
    } catch (err) {
      setError("Failed to delete role. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role nomination
  const handleNominate = async (roleId: string, userId: string, reason: string) => {
    try {
      setIsLoading(true);

      // Check if user meets requirements
      const nominationResult = await nominateForRole(roleId, userId);

      if (nominationResult.eligible) {
        // Create voting thread in Discord
        await createVotingThread(roleId, userId, reason);

        // Show success message
        setError(null);
        alert(`Nomination for ${userId} submitted successfully! A voting thread has been created.`);
      } else {
        // Show error message
        setError(`User does not meet the requirements for this role: ${nominationResult.reason}`);
      }

      setNominatingRole(null);
    } catch (err) {
      setError("Failed to submit nomination. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Manage Roles</h1>

        <Button
          onClick={() => {
            setEditingRole(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Role</span>
        </Button>
      </div>

      {error && (
        <div className="error-alert">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="search-input-wrapper">
        <Search className="search-input-icon" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search roles..."
          className="search-input"
        />
      </div>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {tierOrder.map((tier) => {
            if (!groupedRoles[tier] || groupedRoles[tier].length === 0) return null;

            return (
              <div key={tier} className="space-y-4">
                <h2 className="section-title flex items-center gap-2">
                  <span className={`badge-dot badge-${tier.toLowerCase()}`} />
                  {tier} Roles
                </h2>

                <div className="grid gap-4">
                  {groupedRoles[tier].map((role) => (
                    <RoleCard
                      key={role._id}
                      role={role}
                      badges={badges}
                      onEdit={setEditingRole}
                      onDelete={(roleId) =>
                        setDeleteConfirmation({
                          isOpen: true,
                          roleId,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role form modal */}
      {(isFormOpen || editingRole) && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <RoleForm
            role={editingRole || undefined}
            badges={badges}
            onSave={editingRole ? handleUpdateRole : handleCreateRole}
            onCancel={() => {
              setEditingRole(null);
              setIsFormOpen(false);
            }}
          />
        </div>
      )}

      {/* Nomination form modal */}
      {nominatingRole && (
        <div className="modal-container">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <NominationForm role={nominatingRole} onSubmit={handleNominate} onCancel={() => setNominatingRole(null)} />
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, roleId: null })}
        onConfirm={() => {
          if (deleteConfirmation.roleId) {
            handleDeleteRole(deleteConfirmation.roleId);
          }
        }}
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone."
      />
    </div>
  );
}

