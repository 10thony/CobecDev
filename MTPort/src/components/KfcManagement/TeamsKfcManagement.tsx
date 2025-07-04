import React, { useState, useEffect } from 'react';
import {
  TextField,
  PrimaryButton,
  DefaultButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  Card,
  CardHeader,
  CardContent,
  Stack,
  IStackTokens,
  Text,
  Link,
  IconButton,
  TooltipHost,
  DirectionalHint,
  Separator,
  Badge,
  ITextStyles,
  IMessageBarStyles,
  ICheckboxStyles,
  IDropdownStyles,
  ITextFieldStyles,
  IButtonStyles,
  Dropdown,
  IDropdownOption,
  Checkbox,
  DetailsList,
  IColumn,
  SelectionMode,
  DetailsListLayoutMode,
  CommandBar,
  ICommandBarItemProps,
  Panel,
  PanelType,
  Label,
  Toggle,
  ProgressIndicator,
  Callout,
  DirectionalHint as CalloutDirectionalHint,
  Dialog,
  DialogType,
  DialogFooter,
  Modal,
  IModalStyles,
  IStackStyles,
  Persona,
  PersonaSize,
  PersonaPresence,
  ActionButton,
  IActionButtonStyles,
  Pivot,
  PivotItem,
  IStackItemStyles,
  IStackTokens as IStackTokensV8,
  IStackStyles as IStackStylesV8
} from '@fluentui/react';
import { 
  TrophyIcon, 
  UserIcon, 
  DatabaseIcon, 
  SettingsIcon, 
  AlertCircleIcon, 
  ShieldIcon,
  AddIcon,
  EditIcon,
  DeleteIcon,
  CheckMarkIcon,
  CancelIcon,
  RefreshIcon,
  InfoIcon,
  WarningIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  StarIcon,
  AwardIcon,
  TeamIcon,
  CalendarIcon,
  LocationIcon,
  EmailIcon,
  PhoneIcon
} from '@fluentui/react-icons-mdl2';
import { TeamsContext } from '../../types';
import { useTeamsApi } from '../../hooks/useTeamsApi';
import { useTeamsAuth } from '../../hooks/useTeamsAuth';

interface TeamsKfcManagementProps {
  teamsContext: TeamsContext | null;
  onNavigate: (route: 'search' | 'data' | 'kfc') => void;
}

// Teams storage keys
const STORAGE_KEYS = {
  NOMINATIONS: 'teams_kfcManagement_nominations',
  TEAM_MEMBERS: 'teams_kfcManagement_teamMembers',
  CACHE_TIME: 'teams_kfcManagement_cacheTime'
};

// Nomination status types
type NominationStatus = 'pending' | 'approved' | 'rejected';

// Nomination interface
interface Nomination {
  _id: string;
  nomineeId: string;
  nomineeName: string;
  nomineeEmail: string;
  nominatorId: string;
  nominatorName: string;
  nominatorEmail: string;
  reason: string;
  category: string;
  points: number;
  status: NominationStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  teamId?: string;
  channelId?: string;
}

// Team member interface
interface TeamMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
  department?: string;
  title?: string;
  photoUrl?: string;
}

export const TeamsKfcManagement: React.FC<TeamsKfcManagementProps> = ({
  teamsContext,
  onNavigate
}) => {
  const { teamsApi } = useTeamsApi();
  const { user } = useTeamsAuth();
  
  const [activeTab, setActiveTab] = useState<'nominations' | 'points' | 'database'>('nominations');
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Nomination form state
  const [showNominationForm, setShowNominationForm] = useState(false);
  const [selectedNominee, setSelectedNominee] = useState<string>('');
  const [nominationReason, setNominationReason] = useState('');
  const [nominationCategory, setNominationCategory] = useState('');
  const [nominationPoints, setNominationPoints] = useState(1);
  const [submittingNomination, setSubmittingNomination] = useState(false);

  // Nomination details state
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);
  const [showNominationDetails, setShowNominationDetails] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewingNomination, setReviewingNomination] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<NominationStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Teams integration state
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [teamsChannelId, setTeamsChannelId] = useState<string>('');

  // Load data on component mount
  useEffect(() => {
    loadData();
    checkAdminStatus();
  }, []);

  // Check admin status
  const checkAdminStatus = async () => {
    try {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      // In Teams, we can check if the user has admin permissions
      // This would typically be done through Microsoft Graph API
      // For now, we'll assume all authenticated users can manage nominations
      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Load data from Teams storage or API
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load nominations and team members
      const [nominationsData, teamMembersData] = await Promise.all([
        teamsApi.getNominations(),
        teamsApi.getTeamMembers()
      ]);

      setNominations(nominationsData);
      setTeamMembers(teamMembersData);
      setMessage(`Loaded ${nominationsData.length} nominations and ${teamMembersData.length} team members`);
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error loading data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle nomination submission
  const handleSubmitNomination = async () => {
    if (!selectedNominee || !nominationReason || !nominationCategory) {
      setMessage('Please fill in all required fields');
      return;
    }

    setSubmittingNomination(true);
    
    try {
      const selectedMember = teamMembers.find(member => member.id === selectedNominee);
      if (!selectedMember) {
        throw new Error('Selected nominee not found');
      }

      const nominationData = {
        nomineeId: selectedNominee,
        nomineeName: selectedMember.displayName,
        nomineeEmail: selectedMember.email,
        nominatorId: user?.id || '',
        nominatorName: user?.displayName || '',
        nominatorEmail: user?.email || '',
        reason: nominationReason,
        category: nominationCategory,
        points: nominationPoints,
        teamId: teamsContext?.team?.id || '',
        channelId: teamsChannelId
      };

      const newNomination = await teamsApi.createNomination(nominationData);
      setNominations(prev => [...prev, newNomination]);
      
      // Send Teams notification
      if (teamsChannelId) {
        await teamsApi.sendNominationNotification(newNomination, teamsChannelId);
      }

      setMessage('Nomination submitted successfully!');
      setShowNominationForm(false);
      resetNominationForm();
    } catch (error) {
      console.error('Error submitting nomination:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`Error submitting nomination: ${errorMessage}`);
    } finally {
      setSubmittingNomination(false);
    }
  };

  // Handle nomination approval
  const handleApproveNomination = async () => {
    if (!selectedNomination || !reviewNotes.trim()) {
      setMessage('Please provide review notes');
      return;
    }

    setReviewingNomination(true);
    
    try {
      const updatedNomination = await teamsApi.approveNomination(
        selectedNomination._id,
        user?.id || '',
        user?.displayName || ''
      );

      setNominations(prev => 
        prev.map(nom => 
          nom._id === selectedNomination._id ? updatedNomination : nom
        )
      );

      setMessage('Nomination approved successfully!');
      setShowNominationDetails(false);
      setSelectedNomination(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error approving nomination:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`Error approving nomination: ${errorMessage}`);
    } finally {
      setReviewingNomination(false);
    }
  };

  // Handle nomination rejection
  const handleRejectNomination = async () => {
    if (!selectedNomination || !reviewNotes.trim()) {
      setMessage('Please provide review notes');
      return;
    }

    setReviewingNomination(true);
    
    try {
      const updatedNomination = await teamsApi.rejectNomination(
        selectedNomination._id,
        user?.id || '',
        user?.displayName || '',
        reviewNotes
      );

      setNominations(prev => 
        prev.map(nom => 
          nom._id === selectedNomination._id ? updatedNomination : nom
        )
      );

      setMessage('Nomination rejected');
      setShowNominationDetails(false);
      setSelectedNomination(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error rejecting nomination:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`Error rejecting nomination: ${errorMessage}`);
    } finally {
      setReviewingNomination(false);
    }
  };

  // Reset nomination form
  const resetNominationForm = () => {
    setSelectedNominee('');
    setNominationReason('');
    setNominationCategory('');
    setNominationPoints(1);
  };

  // Get filtered nominations
  const getFilteredNominations = () => {
    let filtered = nominations;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(nom => nom.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(nom => nom.category === categoryFilter);
    }

    return filtered;
  };

  // Get nomination statistics
  const getNominationStats = () => {
    const total = nominations.length;
    const pending = nominations.filter(nom => nom.status === 'pending').length;
    const approved = nominations.filter(nom => nom.status === 'approved').length;
    const rejected = nominations.filter(nom => nom.status === 'rejected').length;
    const totalPoints = nominations
      .filter(nom => nom.status === 'approved')
      .reduce((sum, nom) => sum + nom.points, 0);

    return { total, pending, approved, rejected, totalPoints };
  };

  // Fluent UI styles
  const stackTokens: IStackTokens = {
    childrenGap: 16,
    padding: 20
  };

  const cardStyles = {
    root: {
      marginBottom: 16
    }
  };

  const buttonStyles: IButtonStyles = {
    root: {
      marginRight: 8
    }
  };

  const textFieldStyles: ITextFieldStyles = {
    root: {
      width: '100%'
    }
  };

  const messageBarStyles: IMessageBarStyles = {
    root: {
      marginBottom: 16
    }
  };

  const modalStyles: IModalStyles = {
    main: {
      width: 600,
      maxWidth: '90vw'
    }
  };

  // Dropdown options
  const statusOptions: IDropdownOption[] = [
    { key: 'all', text: 'All Statuses' },
    { key: 'pending', text: 'Pending' },
    { key: 'approved', text: 'Approved' },
    { key: 'rejected', text: 'Rejected' }
  ];

  const categoryOptions: IDropdownOption[] = [
    { key: 'all', text: 'All Categories' },
    { key: 'excellence', text: 'Excellence' },
    { key: 'innovation', text: 'Innovation' },
    { key: 'collaboration', text: 'Collaboration' },
    { key: 'leadership', text: 'Leadership' },
    { key: 'service', text: 'Service' },
    { key: 'other', text: 'Other' }
  ];

  const pointsOptions: IDropdownOption[] = [
    { key: 1, text: '1 Point' },
    { key: 2, text: '2 Points' },
    { key: 3, text: '3 Points' },
    { key: 4, text: '4 Points' },
    { key: 5, text: '5 Points' }
  ];

  const teamMemberOptions: IDropdownOption[] = teamMembers.map(member => ({
    key: member.id,
    text: member.displayName,
    data: member
  }));

  // Command bar items
  const commandBarItems: ICommandBarItemProps[] = [
    {
      key: 'refresh',
      text: 'Refresh',
      iconProps: { iconName: 'Refresh' },
      onClick: loadData,
      disabled: loading
    },
    {
      key: 'newNomination',
      text: 'New Nomination',
      iconProps: { iconName: 'Add' },
      onClick: () => setShowNominationForm(true),
      disabled: loading
    }
  ];

  const stats = getNominationStats();
  const filteredNominations = getFilteredNominations();

  return (
    <Stack tokens={stackTokens}>
      {/* Header */}
      <Card styles={cardStyles}>
        <CardHeader>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
              <TrophyIcon />
              <Text variant="xLarge" styles={{ root: { fontWeight: 'bold' } }}>
                KFC Management
              </Text>
            </Stack>
            {!isAdmin && (
              <Badge text="Limited Access" styles={{ root: { backgroundColor: '#ffaa00' } }} />
            )}
          </Stack>
          <Text variant="medium" styles={{ root: { color: '#666' } }}>
            {isAdmin 
              ? 'Manage points, nominations, and database operations'
              : 'Submit and manage employee nominations'
            }
          </Text>
        </CardHeader>
      </Card>

      {/* Status Message */}
      {message && (
        <MessageBar 
          messageBarType={message.includes('Error') ? MessageBarType.error : MessageBarType.success}
          styles={messageBarStyles}
        >
          {message}
        </MessageBar>
      )}

      {/* Error Display */}
      {error && (
        <MessageBar messageBarType={MessageBarType.error} styles={messageBarStyles}>
          {error}
        </MessageBar>
      )}

      {/* Statistics */}
      <Card styles={cardStyles}>
        <CardContent>
          <Stack horizontal tokens={{ childrenGap: 32 }}>
            <Stack horizontalAlign="center">
              <Text variant="xLarge" styles={{ root: { fontWeight: 'bold', color: '#0078d4' } }}>
                {stats.total}
              </Text>
              <Text variant="medium">Total Nominations</Text>
            </Stack>
            <Stack horizontalAlign="center">
              <Text variant="xLarge" styles={{ root: { fontWeight: 'bold', color: '#ffaa00' } }}>
                {stats.pending}
              </Text>
              <Text variant="medium">Pending</Text>
            </Stack>
            <Stack horizontalAlign="center">
              <Text variant="xLarge" styles={{ root: { fontWeight: 'bold', color: '#107c10' } }}>
                {stats.approved}
              </Text>
              <Text variant="medium">Approved</Text>
            </Stack>
            <Stack horizontalAlign="center">
              <Text variant="xLarge" styles={{ root: { fontWeight: 'bold', color: '#d13438' } }}>
                {stats.rejected}
              </Text>
              <Text variant="medium">Rejected</Text>
            </Stack>
            <Stack horizontalAlign="center">
              <Text variant="xLarge" styles={{ root: { fontWeight: 'bold', color: '#6b46c1' } }}>
                {stats.totalPoints}
              </Text>
              <Text variant="medium">Total Points</Text>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Command Bar */}
      <CommandBar
        items={commandBarItems}
        styles={{ root: { marginBottom: 16 } }}
      />

      {/* Main Content */}
      <Pivot selectedKey={activeTab} onLinkClick={(item) => setActiveTab(item?.props.itemKey as any)}>
        <PivotItem headerText="Nominations" itemKey="nominations">
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Filters */}
            <Card styles={cardStyles}>
              <CardContent>
                <Stack horizontal tokens={{ childrenGap: 16 }}>
                  <Dropdown
                    label="Status Filter"
                    selectedKey={statusFilter}
                    options={statusOptions}
                    onChange={(_, option) => option && setStatusFilter(option.key as any)}
                    styles={{ root: { width: 200 } }}
                  />
                  <Dropdown
                    label="Category Filter"
                    selectedKey={categoryFilter}
                    options={categoryOptions}
                    onChange={(_, option) => option && setCategoryFilter(option.key as string)}
                    styles={{ root: { width: 200 } }}
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Nominations List */}
            <Card styles={cardStyles}>
              <CardHeader>
                <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                  Nominations ({filteredNominations.length})
                </Text>
              </CardHeader>
              <CardContent>
                {filteredNominations.length === 0 ? (
                  <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
                    <TrophyIcon style={{ fontSize: 48, color: '#666' }} />
                    <Text variant="large">No nominations found</Text>
                    <Text variant="medium" styles={{ root: { color: '#666' } }}>
                      {statusFilter !== 'all' || categoryFilter !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Create your first nomination to get started'
                      }
                    </Text>
                  </Stack>
                ) : (
                  <Stack tokens={{ childrenGap: 12 }}>
                    {filteredNominations.map((nomination) => (
                      <Card 
                        key={nomination._id}
                        styles={{ root: { cursor: 'pointer' } }}
                        onClick={() => {
                          setSelectedNomination(nomination);
                          setShowNominationDetails(true);
                        }}
                      >
                        <CardContent>
                          <Stack horizontal horizontalAlign="space-between" verticalAlign="start">
                            <Stack tokens={{ childrenGap: 8 }}>
                              <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                                <Persona
                                  text={nomination.nomineeName}
                                  size={PersonaSize.size32}
                                  presence={PersonaPresence.online}
                                />
                                <Badge 
                                  text={nomination.status}
                                  styles={{ 
                                    root: { 
                                      backgroundColor: nomination.status === 'approved' ? '#107c10' :
                                                 nomination.status === 'rejected' ? '#d13438' : '#ffaa00'
                                    } 
                                  }}
                                />
                                <Badge 
                                  text={`${nomination.points} pts`}
                                  styles={{ root: { backgroundColor: '#6b46c1' } }}
                                />
                              </Stack>
                              <Text variant="medium" styles={{ root: { fontWeight: 'semibold' } }}>
                                {nomination.category}
                              </Text>
                              <Text variant="small" styles={{ root: { color: '#666' } }}>
                                {nomination.reason.substring(0, 150)}...
                              </Text>
                              <Stack horizontal tokens={{ childrenGap: 16 }}>
                                <Text variant="small" styles={{ root: { color: '#666' } }}>
                                  Nominated by: {nomination.nominatorName}
                                </Text>
                                <Text variant="small" styles={{ root: { color: '#666' } }}>
                                  {new Date(nomination.submittedAt).toLocaleDateString()}
                                </Text>
                              </Stack>
                            </Stack>
                            <ChevronRightIcon />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </PivotItem>

        {isAdmin && (
          <PivotItem headerText="Points Manager" itemKey="points">
            <Card styles={cardStyles}>
              <CardContent>
                <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
                  <TrophyIcon style={{ fontSize: 48, color: '#666' }} />
                  <Text variant="large">Points Manager</Text>
                  <Text variant="medium" styles={{ root: { color: '#666' } }}>
                    Points management functionality will be implemented in the next milestone
                  </Text>
                </Stack>
              </CardContent>
            </Card>
          </PivotItem>
        )}

        {isAdmin && (
          <PivotItem headerText="Database" itemKey="database">
            <Card styles={cardStyles}>
              <CardContent>
                <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
                  <DatabaseIcon style={{ fontSize: 48, color: '#666' }} />
                  <Text variant="large">Database Management</Text>
                  <Text variant="medium" styles={{ root: { color: '#666' } }}>
                    Database management functionality will be implemented in the next milestone
                  </Text>
                </Stack>
              </CardContent>
            </Card>
          </PivotItem>
        )}
      </Pivot>

      {/* New Nomination Form */}
      <Modal
        isOpen={showNominationForm}
        onDismiss={() => setShowNominationForm(false)}
        styles={modalStyles}
      >
        <Card>
          <CardHeader>
            <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
              Submit New Nomination
            </Text>
          </CardHeader>
          <CardContent>
            <Stack tokens={{ childrenGap: 16 }}>
              <Dropdown
                label="Nominee *"
                selectedKey={selectedNominee}
                options={teamMemberOptions}
                onChange={(_, option) => option && setSelectedNominee(option.key as string)}
                placeholder="Select a team member"
                required
              />
              <Dropdown
                label="Category *"
                selectedKey={nominationCategory}
                options={categoryOptions.filter(opt => opt.key !== 'all')}
                onChange={(_, option) => option && setNominationCategory(option.key as string)}
                placeholder="Select a category"
                required
              />
              <Dropdown
                label="Points *"
                selectedKey={nominationPoints}
                options={pointsOptions}
                onChange={(_, option) => option && setNominationPoints(option.key as number)}
                required
              />
              <TextField
                label="Reason *"
                multiline
                rows={4}
                value={nominationReason}
                onChange={(_, newValue) => setNominationReason(newValue || '')}
                placeholder="Describe why this person deserves recognition..."
                required
              />
            </Stack>
          </CardContent>
          <CardContent>
            <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 8 }}>
              <DefaultButton
                onClick={() => setShowNominationForm(false)}
                text="Cancel"
                disabled={submittingNomination}
              />
              <PrimaryButton
                onClick={handleSubmitNomination}
                text="Submit Nomination"
                disabled={submittingNomination || !selectedNominee || !nominationReason || !nominationCategory}
                iconProps={{ iconName: 'Add' }}
              />
            </Stack>
          </CardContent>
        </Card>
      </Modal>

      {/* Nomination Details Modal */}
      <Modal
        isOpen={showNominationDetails}
        onDismiss={() => setShowNominationDetails(false)}
        styles={modalStyles}
      >
        {selectedNomination && (
          <Card>
            <CardHeader>
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text variant="large" styles={{ root: { fontWeight: 'semibold' } }}>
                  Nomination Details
                </Text>
                <Badge 
                  text={selectedNomination.status}
                  styles={{ 
                    root: { 
                      backgroundColor: selectedNomination.status === 'approved' ? '#107c10' :
                                 selectedNomination.status === 'rejected' ? '#d13438' : '#ffaa00'
                    } 
                  }}
                />
              </Stack>
            </CardHeader>
            <CardContent>
              <Stack tokens={{ childrenGap: 16 }}>
                <Stack horizontal tokens={{ childrenGap: 16 }}>
                  <Persona
                    text={selectedNomination.nomineeName}
                    secondaryText={selectedNomination.nomineeEmail}
                    size={PersonaSize.size48}
                    presence={PersonaPresence.online}
                  />
                  <Stack tokens={{ childrenGap: 4 }}>
                    <Text variant="medium" styles={{ root: { fontWeight: 'semibold' } }}>
                      {selectedNomination.category}
                    </Text>
                    <Text variant="medium">
                      {selectedNomination.points} Points
                    </Text>
                  </Stack>
                </Stack>
                
                <Separator />
                
                <Stack tokens={{ childrenGap: 8 }}>
                  <Text variant="medium" styles={{ root: { fontWeight: 'semibold' } }}>
                    Reason for Nomination
                  </Text>
                  <Text variant="small">{selectedNomination.reason}</Text>
                </Stack>
                
                <Separator />
                
                <Stack tokens={{ childrenGap: 8 }}>
                  <Text variant="medium" styles={{ root: { fontWeight: 'semibold' } }}>
                    Submitted by
                  </Text>
                  <Text variant="small">{selectedNomination.nominatorName}</Text>
                  <Text variant="small">{new Date(selectedNomination.submittedAt).toLocaleString()}</Text>
                </Stack>

                {selectedNomination.status !== 'pending' && (
                  <>
                    <Separator />
                    <Stack tokens={{ childrenGap: 8 }}>
                      <Text variant="medium" styles={{ root: { fontWeight: 'semibold' } }}>
                        Review Details
                      </Text>
                      <Text variant="small">Reviewed by: {selectedNomination.reviewerName}</Text>
                      <Text variant="small">{selectedNomination.reviewedAt && new Date(selectedNomination.reviewedAt).toLocaleString()}</Text>
                      {selectedNomination.reviewNotes && (
                        <Text variant="small">Notes: {selectedNomination.reviewNotes}</Text>
                      )}
                    </Stack>
                  </>
                )}

                {selectedNomination.status === 'pending' && isAdmin && (
                  <>
                    <Separator />
                    <TextField
                      label="Review Notes *"
                      multiline
                      rows={3}
                      value={reviewNotes}
                      onChange={(_, newValue) => setReviewNotes(newValue || '')}
                      placeholder="Provide feedback on this nomination..."
                      required
                    />
                  </>
                )}
              </Stack>
            </CardContent>
            <CardContent>
              <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 8 }}>
                <DefaultButton
                  onClick={() => setShowNominationDetails(false)}
                  text="Close"
                  disabled={reviewingNomination}
                />
                {selectedNomination.status === 'pending' && isAdmin && (
                  <>
                    <DefaultButton
                      onClick={handleRejectNomination}
                      text="Reject"
                      disabled={reviewingNomination || !reviewNotes.trim()}
                      iconProps={{ iconName: 'Cancel' }}
                      styles={{ root: { backgroundColor: '#d13438', color: 'white' } }}
                    />
                    <PrimaryButton
                      onClick={handleApproveNomination}
                      text="Approve"
                      disabled={reviewingNomination || !reviewNotes.trim()}
                      iconProps={{ iconName: 'CheckMark' }}
                      styles={{ root: { backgroundColor: '#107c10' } }}
                    />
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Modal>

      {/* Loading Indicator */}
      {loading && (
        <Card styles={cardStyles}>
          <CardContent>
            <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
              <Spinner size={SpinnerSize.large} label="Loading nominations and team members..." />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 16 }}>
        <DefaultButton
          onClick={() => onNavigate('search')}
          text="Go to Vector Search"
          iconProps={{ iconName: 'Search' }}
        />
        <DefaultButton
          onClick={() => onNavigate('data')}
          text="Go to Data Management"
          iconProps={{ iconName: 'Database' }}
        />
      </Stack>
    </Stack>
  );
}; 