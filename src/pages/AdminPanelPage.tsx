import React, { useState, useEffect } from 'react';
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Users, 
  Shield, 
  UserPlus, 
  Trash2, 
  RefreshCw, 
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from "@clerk/clerk-react";

export function AdminPanelPage() {
  const { userId: currentUserId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Check if current user is admin
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  const isCobecAdmin = useQuery(api.cobecAdmins.checkIfUserIsCobecAdmin);
  
  // Get all user roles
  const allUserRoles = useQuery(api.userRoles.getAllUserRoles);
  
  // Get all cobec admins
  const allCobecAdmins = useQuery(api.cobecAdmins.getAllCobecAdmins);
  
  // Get Clerk users (action)
  const [clerkUsers, setClerkUsers] = useState<any[]>([]);
  const getClerkUsersAction = useAction(api.cobecAdmins.getClerkUsers);
  
  // Mutations
  const setUserRoleMutation = useMutation(api.userRoles.setUserRole);
  const addCobecAdminMutation = useMutation(api.cobecAdmins.addCobecAdmin);
  const removeCobecAdminMutation = useMutation(api.cobecAdmins.removeCobecAdmin);
  const ensureAdminExistsMutation = useMutation(api.userRoles.ensureAdminExists);

  // Check if user has admin access
  const isAdmin = userRole === "admin" || isCobecAdmin === true;

  // Load Clerk users
  const loadClerkUsers = async () => {
    if (!isAdmin) return;
    
    setIsLoadingUsers(true);
    try {
      const users = await getClerkUsersAction();
      setClerkUsers(users);
    } catch (error: any) {
      console.error("Error loading Clerk users:", error);
      toast.error(`Failed to load users: ${error.message}`);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Auto-promote user if no admins exist
  useEffect(() => {
    const autoPromoteIfNeeded = async () => {
      // Check if there are no admins (allUserRoles is empty array when no admins)
      if (allUserRoles !== undefined && allUserRoles.length === 0 && 
          allCobecAdmins !== undefined && allCobecAdmins.length === 0) {
        try {
          console.log("No admins found. Auto-promoting current user...");
          await ensureAdminExistsMutation();
          toast.success("You have been automatically promoted to admin!");
        } catch (error: any) {
          console.error("Error auto-promoting user:", error);
          // Don't show error toast - the mutation might have already run
        }
      }
    };

    if (allUserRoles !== undefined && allCobecAdmins !== undefined) {
      autoPromoteIfNeeded();
    }
  }, [allUserRoles, allCobecAdmins, ensureAdminExistsMutation]);

  useEffect(() => {
    if (isAdmin) {
      loadClerkUsers();
    }
  }, [isAdmin]);

  // Filter users based on search query
  const filteredClerkUsers = clerkUsers.filter(user => 
    user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get user's role from userRoles table
  const getUserRole = (userId: string) => {
    return allUserRoles?.find(ur => ur.userId === userId)?.role || "user";
  };

  // Check if user is cobec admin
  const isUserCobecAdmin = (userId: string) => {
    return allCobecAdmins?.some(ca => ca.clerkUserId === userId) || false;
  };

  // Handle setting user role
  const handleSetUserRole = async (userId: string, role: "admin" | "user") => {
    try {
      await setUserRoleMutation({ userId, role });
      toast.success(`User role set to ${role}`);
    } catch (error: any) {
      toast.error(`Failed to set role: ${error.message}`);
    }
  };

  // Handle adding cobec admin
  const handleAddCobecAdmin = async (userId: string, name?: string, email?: string) => {
    try {
      await addCobecAdminMutation({ 
        clerkUserId: userId,
        name,
        email,
        role: "admin"
      });
      toast.success("User added as Cobec Admin");
    } catch (error: any) {
      toast.error(`Failed to add admin: ${error.message}`);
    }
  };

  // Handle removing cobec admin
  const handleRemoveCobecAdmin = async (userId: string) => {
    if (userId === currentUserId) {
      toast.error("Cannot remove yourself");
      return;
    }
    
    if (!confirm("Are you sure you want to remove this admin?")) {
      return;
    }

    try {
      await removeCobecAdminMutation({ clerkUserId: userId });
      toast.success("Admin removed");
    } catch (error: any) {
      toast.error(`Failed to remove admin: ${error.message}`);
    }
  };

  // Copy user ID to clipboard
  const copyUserId = (userId: string) => {
    navigator.clipboard.writeText(userId);
    setCopiedId(userId);
    toast.success("User ID copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Add user by ID
  const handleAddUserById = async () => {
    if (!selectedUserId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    const user = clerkUsers.find(u => u.id === selectedUserId.trim());
    if (user) {
      await handleAddCobecAdmin(selectedUserId.trim(), user.fullName, user.email);
    } else {
      // User not found in Clerk, but we can still add them
      await handleAddCobecAdmin(selectedUserId.trim());
    }
    setSelectedUserId("");
  };

  if (userRole === undefined || isCobecAdmin === undefined) {
    return (
      <div className="min-h-screen bg-tron-bg-deep flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-tron-bg-deep flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-tron-red mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-tron-white mb-2">Access Denied</h1>
          <p className="text-tron-gray">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tron-bg-deep">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-tron-white flex items-center space-x-3">
                <Shield className="h-8 w-8 text-tron-cyan" />
                <span>Admin Panel</span>
              </h1>
              <p className="mt-2 text-lg text-tron-gray">
                Manage user roles and admin access
              </p>
            </div>
            <button
              onClick={loadClerkUsers}
              disabled={isLoadingUsers}
              className="flex items-center space-x-2 px-4 py-2 bg-tron-cyan/20 text-tron-white rounded-md hover:bg-tron-cyan/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>Refresh Users</span>
            </button>
          </div>
        </div>

        {/* Add User by ID Section */}
        <div className="mb-6 bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-6">
          <h2 className="text-xl font-semibold text-tron-white mb-4 flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-tron-cyan" />
            <span>Add User by Clerk ID</span>
          </h2>
          <div className="flex space-x-2">
            <input
              type="text"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              placeholder="Enter Clerk User ID (e.g., user_2xxx...)"
              className="flex-1 px-4 py-2 bg-tron-bg-elevated border border-tron-cyan/20 rounded-md text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan"
            />
            <button
              onClick={handleAddUserById}
              className="px-6 py-2 bg-tron-cyan text-tron-white rounded-md hover:bg-tron-cyan/80 transition-colors"
            >
              Add as Cobec Admin
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-tron-gray" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by ID, name, or email..."
              className="w-full pl-10 pr-4 py-2 bg-tron-bg-panel border border-tron-cyan/20 rounded-md text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan"
            />
          </div>
        </div>

        {/* User Roles Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
            <div className="text-sm text-tron-gray mb-1">Total Users</div>
            <div className="text-2xl font-bold text-tron-white">{clerkUsers.length}</div>
          </div>
          <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
            <div className="text-sm text-tron-gray mb-1">System Admins</div>
            <div className="text-2xl font-bold text-tron-cyan">{allUserRoles?.filter(ur => ur.role === "admin").length || 0}</div>
          </div>
          <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-4">
            <div className="text-sm text-tron-gray mb-1">Cobec Admins</div>
            <div className="text-2xl font-bold text-tron-cyan">{allCobecAdmins?.length || 0}</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-tron-bg-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">System Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">Cobec Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tron-cyan/10">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-tron-gray">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredClerkUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-tron-gray">
                      {clerkUsers.length === 0 ? "No users found. Click 'Refresh Users' to load." : "No users match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredClerkUsers.map((user) => {
                    const systemRole = getUserRole(user.id);
                    const isCobec = isUserCobecAdmin(user.id);
                    const isCurrentUser = user.id === currentUserId;

                    return (
                      <tr key={user.id} className="hover:bg-tron-bg-elevated transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-tron-cyan/20 flex items-center justify-center">
                              <Users className="h-5 w-5 text-tron-cyan" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-tron-white">{user.fullName}</div>
                              <div className="text-sm text-tron-gray">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <code className="text-xs text-tron-gray font-mono">{user.id}</code>
                            <button
                              onClick={() => copyUserId(user.id)}
                              className="text-tron-cyan hover:text-tron-cyan/80 transition-colors"
                              title="Copy User ID"
                            >
                              {copiedId === user.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {systemRole === "admin" ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-tron-cyan" />
                                <span className="text-sm text-tron-cyan font-medium">Admin</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-5 w-5 text-tron-gray" />
                                <span className="text-sm text-tron-gray">User</span>
                              </>
                            )}
                            {!isCurrentUser && (
                              <select
                                value={systemRole}
                                onChange={(e) => handleSetUserRole(user.id, e.target.value as "admin" | "user")}
                                className="ml-2 px-2 py-1 text-xs bg-tron-bg-elevated border border-tron-cyan/20 rounded text-tron-white focus:outline-none focus:ring-1 focus:ring-tron-cyan"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isCobec ? (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-tron-cyan" />
                              <span className="text-sm text-tron-cyan font-medium">Yes</span>
                              {!isCurrentUser && (
                                <button
                                  onClick={() => handleRemoveCobecAdmin(user.id)}
                                  className="ml-2 text-tron-red hover:text-tron-red/80 transition-colors"
                                  title="Remove Cobec Admin"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddCobecAdmin(user.id, user.fullName, user.email)}
                              className="flex items-center space-x-2 px-3 py-1 bg-tron-cyan/20 text-tron-cyan rounded-md hover:bg-tron-cyan/30 transition-colors text-sm"
                            >
                              <UserPlus className="h-4 w-4" />
                              <span>Add</span>
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-tron-gray">
                          {isCurrentUser && <span className="text-tron-gray">(You)</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-tron-bg-card border-tron-cyan/30 rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-tron-white mb-3 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-tron-cyan" />
            <span>About User Roles</span>
          </h3>
          <div className="space-y-2 text-sm text-tron-gray">
            <p>
              <strong className="text-tron-white">System Role:</strong> Controls general admin access (admin/user). 
              Admins can access admin-only features throughout the application.
            </p>
            <p>
              <strong className="text-tron-white">Cobec Admin:</strong> Grants access to KFC Management features 
              (Points Manager, Nominations, Database). This is separate from the system admin role.
            </p>
            <p className="text-tron-gray/80 italic">
              Note: You cannot remove your own admin status for security reasons.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
