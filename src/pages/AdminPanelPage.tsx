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
  Check,
  BarChart3,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from "@clerk/clerk-react";
import { ProcurementChatAnalytics } from '../components/admin/ProcurementChatAnalytics';

export function AdminPanelPage() {
  const { userId: currentUserId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'hr-dashboard' | 'prompt-types' | 'public-navigation'>('users');

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
  
  // HR Dashboard Components
  const hrComponents = useQuery(api.hrDashboardComponents.getAllComponents);
  const setComponentVisibilityMutation = useMutation(api.hrDashboardComponents.setComponentVisibility);
  const updateComponentMutation = useMutation(api.hrDashboardComponents.updateComponent);
  const initializeComponentsMutation = useMutation(api.hrDashboardComponents.initializeDefaultComponents);
  const bulkUpdateVisibilityMutation = useMutation(api.hrDashboardComponents.bulkUpdateVisibility);

  // Chat System Prompt Types
  const promptTypes = useQuery(api.chatSystemPromptTypes.list);
  const createPromptType = useMutation(api.chatSystemPromptTypes.create);
  const updatePromptType = useMutation(api.chatSystemPromptTypes.update);
  const deletePromptType = useMutation(api.chatSystemPromptTypes.remove);
  const initializePromptTypes = useMutation(api.chatSystemPromptTypes.initializeDefaults);
  
  const [editingType, setEditingType] = useState<any>(null);

  // Public Navigation Items
  const publicNavItems = useQuery(api.publicNavigation.getAll);
  const createNavItem = useMutation(api.publicNavigation.create);
  const updateNavItem = useMutation(api.publicNavigation.update);
  const deleteNavItem = useMutation(api.publicNavigation.remove);
  const initializeNavItems = useMutation(api.publicNavigation.initializeDefaults);
  
  const [editingNavItem, setEditingNavItem] = useState<any>(null);
  const [navItemFormData, setNavItemFormData] = useState({
    path: '',
    label: '',
    icon: 'Globe',
    order: 0,
    isVisible: true,
  });
  const [typeFormData, setTypeFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    isDefault: false,
    order: 0,
  });

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
                Manage user roles, admin access, and view analytics
              </p>
            </div>
            {activeTab === 'users' && (
              <button
                onClick={loadClerkUsers}
                disabled={isLoadingUsers}
                className="flex items-center space-x-2 px-4 py-2 bg-tron-cyan/20 text-tron-white rounded-md hover:bg-tron-cyan/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                <span>Refresh Users</span>
              </button>
            )}
            {activeTab === 'hr-dashboard' && (
              <button
                onClick={async () => {
                  try {
                    await initializeComponentsMutation();
                    toast.success("Default components initialized");
                  } catch (error: any) {
                    toast.error(`Failed to initialize: ${error.message}`);
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-tron-cyan/20 text-tron-white rounded-md hover:bg-tron-cyan/30 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Initialize Default Components</span>
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-tron-cyan/20 mt-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-tron-cyan border-b-2 border-tron-cyan'
                  : 'text-tron-gray hover:text-tron-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-tron-cyan border-b-2 border-tron-cyan'
                  : 'text-tron-gray hover:text-tron-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                AI Chat Analytics
              </div>
            </button>
            <button
              onClick={() => setActiveTab('hr-dashboard')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'hr-dashboard'
                  ? 'text-tron-cyan border-b-2 border-tron-cyan'
                  : 'text-tron-gray hover:text-tron-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                HR Dashboard Settings
              </div>
            </button>
            <button
              onClick={() => setActiveTab('prompt-types')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'prompt-types'
                  ? 'text-tron-cyan border-b-2 border-tron-cyan'
                  : 'text-tron-gray hover:text-tron-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Prompt Types
              </div>
            </button>
            <button
              onClick={() => setActiveTab('public-navigation')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'public-navigation'
                  ? 'text-tron-cyan border-b-2 border-tron-cyan'
                  : 'text-tron-gray hover:text-tron-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Public Navigation
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' ? (
          <ProcurementChatAnalytics />
        ) : activeTab === 'public-navigation' ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-tron-white mb-2 flex items-center space-x-2">
                    <Navigation className="h-5 w-5 text-tron-cyan" />
                    <span>Public Navigation Items</span>
                  </h2>
                  <p className="text-sm text-tron-gray">
                    Manage navigation items shown to unauthenticated users in the public header.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await initializeNavItems();
                        toast.success("Default navigation items initialized");
                      } catch (error: any) {
                        toast.error(`Failed to initialize: ${error.message}`);
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-tron-cyan/20 text-tron-white rounded-md hover:bg-tron-cyan/30 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Initialize Defaults</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingNavItem(null);
                      setNavItemFormData({
                        path: '',
                        label: '',
                        icon: 'Globe',
                        order: (publicNavItems?.length || 0),
                        isVisible: true,
                      });
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-tron-cyan text-tron-white rounded-md hover:bg-tron-cyan/80 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>New Item</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Create/Edit Form */}
            {editingNavItem !== null && (
              <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-6">
                <h3 className="text-lg font-semibold text-tron-white mb-4">
                  {editingNavItem ? 'Edit Navigation Item' : 'Create New Navigation Item'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Path *</label>
                    <input
                      type="text"
                      value={navItemFormData.path}
                      onChange={(e) => setNavItemFormData(prev => ({ ...prev, path: e.target.value }))}
                      placeholder="e.g., /, /government-links"
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Label *</label>
                    <input
                      type="text"
                      value={navItemFormData.label}
                      onChange={(e) => setNavItemFormData(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g., Procurement Links, Government Links"
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Icon *</label>
                    <input
                      type="text"
                      value={navItemFormData.icon}
                      onChange={(e) => setNavItemFormData(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="e.g., Globe, Map (from lucide-react)"
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white"
                    />
                    <p className="text-xs text-tron-gray mt-1">Icon name from lucide-react (e.g., Globe, Map, Home, Link)</p>
                  </div>
                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Order</label>
                    <input
                      type="number"
                      value={navItemFormData.order}
                      onChange={(e) => setNavItemFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white"
                    />
                    <p className="text-xs text-tron-gray mt-1">Lower numbers appear first</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={navItemFormData.isVisible}
                      onChange={(e) => setNavItemFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                      className="w-4 h-4 rounded border-tron-cyan/30 bg-tron-bg-deep text-tron-cyan"
                    />
                    <label className="text-sm text-tron-white">Visible</label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          if (editingNavItem) {
                            await updateNavItem({
                              id: editingNavItem._id,
                              ...navItemFormData,
                            });
                            toast.success("Navigation item updated");
                          } else {
                            await createNavItem(navItemFormData);
                            toast.success("Navigation item created");
                          }
                          setEditingNavItem(null);
                          setNavItemFormData({
                            path: '',
                            label: '',
                            icon: 'Globe',
                            order: 0,
                            isVisible: true,
                          });
                        } catch (error: any) {
                          toast.error(`Failed: ${error.message}`);
                        }
                      }}
                      className="px-4 py-2 bg-tron-cyan text-tron-white rounded-md hover:bg-tron-cyan/80"
                    >
                      {editingNavItem ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingNavItem(null);
                        setNavItemFormData({
                          path: '',
                          label: '',
                          icon: 'Globe',
                          order: 0,
                          isVisible: true,
                        });
                      }}
                      className="px-4 py-2 bg-tron-bg-card text-tron-white rounded-md hover:bg-tron-bg-elevated"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Items List */}
            {publicNavItems === undefined ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-tron-cyan" />
                <span className="ml-3 text-tron-gray">Loading navigation items...</span>
              </div>
            ) : publicNavItems.length === 0 ? (
              <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-tron-gray mx-auto mb-2" />
                <p className="text-tron-gray mb-4">No navigation items configured yet.</p>
                <button
                  onClick={async () => {
                    try {
                      await initializeNavItems();
                      toast.success("Default navigation items initialized");
                    } catch (error: any) {
                      toast.error(`Failed to initialize: ${error.message}`);
                    }
                  }}
                  className="px-4 py-2 bg-tron-cyan text-tron-white rounded-md hover:bg-tron-cyan/80"
                >
                  Initialize Default Navigation Items
                </button>
              </div>
            ) : (
              <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-tron-bg-elevated">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Path</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Label</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Icon</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Visible</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tron-cyan/10">
                    {publicNavItems.map((item) => (
                      <tr key={item._id} className="hover:bg-tron-bg-elevated">
                        <td className="px-6 py-4 text-sm text-tron-white font-mono">{item.path}</td>
                        <td className="px-6 py-4 text-sm text-tron-white">{item.label}</td>
                        <td className="px-6 py-4 text-sm text-tron-gray">{item.icon}</td>
                        <td className="px-6 py-4 text-sm text-tron-gray">{item.order}</td>
                        <td className="px-6 py-4 text-sm">
                          {item.isVisible ? (
                            <div className="flex items-center space-x-2">
                              <Eye className="h-5 w-5 text-tron-cyan" />
                              <span className="text-tron-cyan">Visible</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <EyeOff className="h-5 w-5 text-tron-gray" />
                              <span className="text-tron-gray">Hidden</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingNavItem(item);
                                setNavItemFormData({
                                  path: item.path,
                                  label: item.label,
                                  icon: item.icon,
                                  order: item.order,
                                  isVisible: item.isVisible,
                                });
                              }}
                              className="text-tron-cyan hover:text-tron-cyan-bright"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this navigation item?')) {
                                  try {
                                    await deleteNavItem({ id: item._id });
                                    toast.success("Navigation item deleted");
                                  } catch (error: any) {
                                    toast.error(`Failed: ${error.message}`);
                                  }
                                }
                              }}
                              className="text-neon-error hover:text-neon-error-bright"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Info Section */}
            <div className="bg-tron-bg-card border-tron-cyan/30 rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-tron-white mb-3 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-tron-cyan" />
                <span>About Public Navigation</span>
              </h3>
              <div className="space-y-2 text-sm text-tron-gray">
                <p>
                  <strong className="text-tron-white">Navigation Items:</strong> Configure which navigation links appear 
                  in the header for unauthenticated users. Items are displayed in order based on the "Order" field.
                </p>
                <p>
                  <strong className="text-tron-white">Icons:</strong> Use icon names from lucide-react (e.g., Globe, Map, 
                  Home, Link, Navigation). The icon will be displayed next to the label.
                </p>
                <p>
                  <strong className="text-tron-white">Visibility:</strong> Hidden items won't appear in the navigation 
                  but can be kept for future use.
                </p>
                <p className="text-tron-gray/80 italic">
                  Note: Changes take effect immediately for all unauthenticated users.
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === 'prompt-types' ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-tron-white mb-2 flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-tron-cyan" />
                    <span>Chat System Prompt Types</span>
                  </h2>
                  <p className="text-sm text-tron-gray">
                    Manage system prompt types (basic, leads, procurementHubs). Types are used to categorize system prompts.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await initializePromptTypes();
                        toast.success("Default types initialized");
                      } catch (error: any) {
                        toast.error(`Failed to initialize: ${error.message}`);
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-tron-cyan/20 text-tron-white rounded-md hover:bg-tron-cyan/30 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Initialize Defaults</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingType(null);
                      setTypeFormData({
                        name: '',
                        displayName: '',
                        description: '',
                        isDefault: false,
                        order: (promptTypes?.length || 0),
                      });
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-tron-cyan text-tron-white rounded-md hover:bg-tron-cyan/80 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>New Type</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Create/Edit Form */}
            {editingType !== null && (
              <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-6">
                <h3 className="text-lg font-semibold text-tron-white mb-4">
                  {editingType ? 'Edit Type' : 'Create New Type'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Name *</label>
                    <input
                      type="text"
                      value={typeFormData.name}
                      onChange={(e) => setTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., basic, leads, procurementHubs"
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white"
                      disabled={!!editingType}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Display Name *</label>
                    <input
                      type="text"
                      value={typeFormData.displayName}
                      onChange={(e) => setTypeFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="e.g., Basic, Leads, Procurement Hubs"
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Description</label>
                    <input
                      type="text"
                      value={typeFormData.description}
                      onChange={(e) => setTypeFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={typeFormData.isDefault}
                      onChange={(e) => setTypeFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="w-4 h-4 rounded border-tron-cyan/30 bg-tron-bg-deep text-tron-cyan"
                    />
                    <label className="text-sm text-tron-white">Set as Default Type</label>
                  </div>
                  <div>
                    <label className="block text-sm text-tron-gray mb-2">Order</label>
                    <input
                      type="number"
                      value={typeFormData.order}
                      onChange={(e) => setTypeFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-tron-bg-deep border border-tron-cyan/20 rounded-lg text-tron-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          if (editingType) {
                            await updatePromptType({
                              id: editingType._id,
                              ...typeFormData,
                            });
                            toast.success("Type updated");
                          } else {
                            await createPromptType(typeFormData);
                            toast.success("Type created");
                          }
                          setEditingType(null);
                          setTypeFormData({
                            name: '',
                            displayName: '',
                            description: '',
                            isDefault: false,
                            order: 0,
                          });
                        } catch (error: any) {
                          toast.error(`Failed: ${error.message}`);
                        }
                      }}
                      className="px-4 py-2 bg-tron-cyan text-tron-white rounded-md hover:bg-tron-cyan/80"
                    >
                      {editingType ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingType(null);
                        setTypeFormData({
                          name: '',
                          displayName: '',
                          description: '',
                          isDefault: false,
                          order: 0,
                        });
                      }}
                      className="px-4 py-2 bg-tron-bg-card text-tron-white rounded-md hover:bg-tron-bg-elevated"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Types List */}
            {promptTypes === undefined ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-tron-cyan" />
                <span className="ml-3 text-tron-gray">Loading types...</span>
              </div>
            ) : promptTypes.length === 0 ? (
              <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-tron-gray mx-auto mb-2" />
                <p className="text-tron-gray mb-4">No types configured yet.</p>
                <button
                  onClick={async () => {
                    try {
                      await initializePromptTypes();
                      toast.success("Default types initialized");
                    } catch (error: any) {
                      toast.error(`Failed to initialize: ${error.message}`);
                    }
                  }}
                  className="px-4 py-2 bg-tron-cyan text-tron-white rounded-md hover:bg-tron-cyan/80"
                >
                  Initialize Default Types
                </button>
              </div>
            ) : (
              <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-tron-bg-elevated">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Display Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Default</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tron-cyan/10">
                    {promptTypes.map((type) => (
                      <tr key={type._id} className="hover:bg-tron-bg-elevated">
                        <td className="px-6 py-4 text-sm text-tron-white">{type.name}</td>
                        <td className="px-6 py-4 text-sm text-tron-white">{type.displayName}</td>
                        <td className="px-6 py-4 text-sm text-tron-gray">{type.description || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          {type.isDefault ? (
                            <CheckCircle className="h-5 w-5 text-tron-cyan" />
                          ) : (
                            <XCircle className="h-5 w-5 text-tron-gray" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-tron-gray">{type.order}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingType(type);
                                setTypeFormData({
                                  name: type.name,
                                  displayName: type.displayName,
                                  description: type.description || '',
                                  isDefault: type.isDefault,
                                  order: type.order,
                                });
                              }}
                              className="text-tron-cyan hover:text-tron-cyan-bright"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this type?')) {
                                  try {
                                    await deletePromptType({ id: type._id });
                                    toast.success("Type deleted");
                                  } catch (error: any) {
                                    toast.error(`Failed: ${error.message}`);
                                  }
                                }
                              }}
                              className="text-neon-error hover:text-neon-error-bright"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'hr-dashboard' ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-6">
              <h2 className="text-xl font-semibold text-tron-white mb-2 flex items-center space-x-2">
                <Settings className="h-5 w-5 text-tron-cyan" />
                <span>HR Dashboard Component Visibility</span>
              </h2>
              <p className="text-sm text-tron-gray">
                Control which tabs and components are visible to users in the HR Dashboard. 
                Toggle visibility for each component below.
              </p>
            </div>

            {/* Components List */}
            {hrComponents === undefined ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-tron-cyan" />
                <span className="ml-3 text-tron-gray">Loading components...</span>
              </div>
            ) : hrComponents.length === 0 ? (
              <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 p-6 text-center">
                <AlertCircle className="h-8 w-8 text-tron-gray mx-auto mb-2" />
                <p className="text-tron-gray mb-4">No components configured yet.</p>
                <button
                  onClick={async () => {
                    try {
                      await initializeComponentsMutation();
                      toast.success("Default components initialized");
                    } catch (error: any) {
                      toast.error(`Failed to initialize: ${error.message}`);
                    }
                  }}
                  className="px-4 py-2 bg-tron-cyan text-tron-white rounded-md hover:bg-tron-cyan/80 transition-colors"
                >
                  Initialize Default Components
                </button>
              </div>
            ) : (
              <div className="bg-tron-bg-panel rounded-lg border border-tron-cyan/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-tron-bg-elevated">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                          Component
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                          Visibility
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                          Auth Required
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-tron-gray uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-tron-cyan/10">
                      {hrComponents.map((component) => (
                        <tr key={component._id} className="hover:bg-tron-bg-elevated transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-tron-white">
                              {component.componentName}
                            </div>
                            <div className="text-xs text-tron-gray font-mono">
                              {component.componentId}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-tron-gray">
                              {component.description || "No description"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {component.isVisible ? (
                                <>
                                  <Eye className="h-5 w-5 text-tron-cyan" />
                                  <span className="text-sm text-tron-cyan font-medium">Visible</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-5 w-5 text-tron-gray" />
                                  <span className="text-sm text-tron-gray">Hidden</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {component.requiresAuth !== false ? (
                                <>
                                  <Lock className="h-5 w-5 text-tron-cyan" />
                                  <span className="text-sm text-tron-cyan font-medium">Required</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-5 w-5 text-tron-gray" />
                                  <span className="text-sm text-tron-gray">Public</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await setComponentVisibilityMutation({
                                      componentId: component.componentId,
                                      isVisible: !component.isVisible,
                                    });
                                    toast.success(
                                      `${component.componentName} is now ${!component.isVisible ? 'visible' : 'hidden'}`
                                    );
                                  } catch (error: any) {
                                    toast.error(`Failed to update: ${error.message}`);
                                  }
                                }}
                                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors text-sm ${
                                  component.isVisible
                                    ? 'bg-tron-gray/20 text-tron-gray hover:bg-tron-gray/30'
                                    : 'bg-tron-cyan/20 text-tron-cyan hover:bg-tron-cyan/30'
                                }`}
                              >
                                {component.isVisible ? (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    <span>Hide</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    <span>Show</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const newRequiresAuth = component.requiresAuth !== false;
                                    await updateComponentMutation({
                                      componentId: component.componentId,
                                      requiresAuth: !newRequiresAuth,
                                    });
                                    toast.success(
                                      `${component.componentName} ${!newRequiresAuth ? 'now requires' : 'no longer requires'} authentication`
                                    );
                                  } catch (error: any) {
                                    toast.error(`Failed to update: ${error.message}`);
                                  }
                                }}
                                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors text-sm ${
                                  component.requiresAuth !== false
                                    ? 'bg-tron-gray/20 text-tron-gray hover:bg-tron-gray/30'
                                    : 'bg-tron-cyan/20 text-tron-cyan hover:bg-tron-cyan/30'
                                }`}
                              >
                                {component.requiresAuth !== false ? (
                                  <>
                                    <Unlock className="h-4 w-4" />
                                    <span>Make Public</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-4 w-4" />
                                    <span>Require Auth</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Info Section */}
            <div className="bg-tron-bg-card border-tron-cyan/30 rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-tron-white mb-3 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-tron-cyan" />
                <span>About Component Visibility</span>
              </h3>
              <div className="space-y-2 text-sm text-tron-gray">
                <p>
                  <strong className="text-tron-white">Visibility Control:</strong> Toggle components on or off to 
                  control what users can access in the HR Dashboard. Hidden components will not appear in the 
                  navigation tabs.
                </p>
                <p>
                  <strong className="text-tron-white">Auth Requirement:</strong> Control whether a component requires 
                  authentication. Public components can be accessed by anyone, even without signing in. This is useful 
                  for demo purposes or public-facing features.
                </p>
                <p>
                  <strong className="text-tron-white">Default Components:</strong> If no components are configured, 
                  click "Initialize Default Components" to set up the standard HR Dashboard tabs, including Government Links.
                </p>
                <p>
                  <strong className="text-tron-white">Public Navigation:</strong> Components set to "Public" will be accessible 
                  to unauthenticated users, but to appear in the public navigation bar, they must also be added in the 
                  "Public Navigation" tab. For example, if you want Leads Management to appear in the public navigation, 
                  add it to the Public Navigation items.
                </p>
                <p className="text-tron-gray/80 italic">
                  Note: Changes take effect immediately for all users.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
