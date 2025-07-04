import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { cosmosDbService } from '../services/cosmosDbService';
import { createSharePointService } from '../services/sharePointService';
import { Nomination } from '../types';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const { action, data, accessToken } = req.body;

    switch (action) {
      case 'getNominations':
        await handleGetNominations(context, data);
        break;
      
      case 'createNomination':
        await handleCreateNomination(context, data);
        break;
      
      case 'updateNomination':
        await handleUpdateNomination(context, data);
        break;
      
      case 'deleteNomination':
        await handleDeleteNomination(context, data);
        break;
      
      case 'getNominationsByStatus':
        await handleGetNominationsByStatus(context, data);
        break;
      
      case 'approveNomination':
        await handleApproveNomination(context, data);
        break;
      
      case 'rejectNomination':
        await handleRejectNomination(context, data);
        break;
      
      case 'getTeamMembers':
        await handleGetTeamMembers(context, accessToken);
        break;
      
      case 'sendNominationNotification':
        await handleSendNominationNotification(context, data, accessToken);
        break;
      
      default:
        context.res = {
          status: 400,
          body: {
            error: 'Invalid action specified'
          }
        };
    }

  } catch (error) {
    console.error('KFC management error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

async function handleGetNominations(context: Context, data: any): Promise<void> {
  try {
    const nominations = await cosmosDbService.getAllNominations();

    context.res = {
      status: 200,
      body: {
        nominations,
        totalCount: nominations.length
      }
    };

  } catch (error) {
    console.error('Get nominations error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to get nominations',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleCreateNomination(context: Context, data: any): Promise<void> {
  try {
    const { nomineeId, nomineeName, nominatorId, nominatorName, reason, points } = data;

    if (!nomineeId || !nomineeName || !nominatorId || !nominatorName || !reason || !points) {
      context.res = {
        status: 400,
        body: {
          error: 'Missing required fields for nomination'
        }
      };
      return;
    }

    const nomination = await cosmosDbService.createNomination({
      nomineeId,
      nomineeName,
      nominatorId,
      nominatorName,
      reason,
      points
    });

    context.res = {
      status: 201,
      body: {
        success: true,
        nomination,
        message: 'Nomination created successfully'
      }
    };

  } catch (error) {
    console.error('Create nomination error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to create nomination',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleUpdateNomination(context: Context, data: any): Promise<void> {
  try {
    const { id, updates } = data;

    if (!id || !updates) {
      context.res = {
        status: 400,
        body: {
          error: 'Missing required fields: id and updates'
        }
      };
      return;
    }

    const nomination = await cosmosDbService.updateNomination(id, updates);

    context.res = {
      status: 200,
      body: {
        success: true,
        nomination,
        message: 'Nomination updated successfully'
      }
    };

  } catch (error) {
    console.error('Update nomination error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to update nomination',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleDeleteNomination(context: Context, data: any): Promise<void> {
  try {
    const { id } = data;

    if (!id) {
      context.res = {
        status: 400,
        body: {
          error: 'Missing required field: id'
        }
      };
      return;
    }

    await cosmosDbService.deleteNomination(id);

    context.res = {
      status: 200,
      body: {
        success: true,
        message: 'Nomination deleted successfully'
      }
    };

  } catch (error) {
    console.error('Delete nomination error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to delete nomination',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleGetNominationsByStatus(context: Context, data: any): Promise<void> {
  try {
    const { status } = data;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      context.res = {
        status: 400,
        body: {
          error: 'Invalid status. Must be pending, approved, or rejected'
        }
      };
      return;
    }

    const nominations = await cosmosDbService.getNominationsByStatus(status);

    context.res = {
      status: 200,
      body: {
        nominations,
        status,
        totalCount: nominations.length
      }
    };

  } catch (error) {
    console.error('Get nominations by status error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to get nominations by status',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleApproveNomination(context: Context, data: any): Promise<void> {
  try {
    const { id, approverId, approverName } = data;

    if (!id || !approverId || !approverName) {
      context.res = {
        status: 400,
        body: {
          error: 'Missing required fields: id, approverId, approverName'
        }
      };
      return;
    }

    const nomination = await cosmosDbService.updateNomination(id, {
      status: 'approved',
      approvedBy: approverName,
      approvedAt: new Date()
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        nomination,
        message: 'Nomination approved successfully'
      }
    };

  } catch (error) {
    console.error('Approve nomination error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to approve nomination',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleRejectNomination(context: Context, data: any): Promise<void> {
  try {
    const { id, rejectorId, rejectorName, reason } = data;

    if (!id || !rejectorId || !rejectorName) {
      context.res = {
        status: 400,
        body: {
          error: 'Missing required fields: id, rejectorId, rejectorName'
        }
      };
      return;
    }

    const nomination = await cosmosDbService.updateNomination(id, {
      status: 'rejected',
      approvedBy: rejectorName,
      approvedAt: new Date()
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        nomination,
        message: 'Nomination rejected successfully'
      }
    };

  } catch (error) {
    console.error('Reject nomination error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to reject nomination',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleGetTeamMembers(context: Context, accessToken: string): Promise<void> {
  try {
    // This would typically use Microsoft Graph API to get team members
    // For now, we'll return a mock response
    const teamMembers = [
      {
        id: 'user1',
        displayName: 'John Doe',
        email: 'john.doe@company.com',
        role: 'member'
      },
      {
        id: 'user2',
        displayName: 'Jane Smith',
        email: 'jane.smith@company.com',
        role: 'owner'
      }
    ];

    context.res = {
      status: 200,
      body: {
        teamMembers,
        totalCount: teamMembers.length
      }
    };

  } catch (error) {
    console.error('Get team members error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to get team members',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function handleSendNominationNotification(context: Context, data: any, accessToken: string): Promise<void> {
  try {
    const { nomination, channelId, message } = data;

    if (!nomination || !channelId) {
      context.res = {
        status: 400,
        body: {
          error: 'Missing required fields: nomination and channelId'
        }
      };
      return;
    }

    // Create adaptive card for nomination notification
    const adaptiveCard = {
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: 'New KFC Nomination',
          weight: 'Bolder',
          size: 'Large'
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: 'Nominee:',
              value: nomination.nomineeName
            },
            {
              title: 'Nominator:',
              value: nomination.nominatorName
            },
            {
              title: 'Points:',
              value: nomination.points.toString()
            },
            {
              title: 'Reason:',
              value: nomination.reason
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Approve',
          data: {
            action: 'approveNomination',
            nominationId: nomination.id
          }
        },
        {
          type: 'Action.Submit',
          title: 'Reject',
          data: {
            action: 'rejectNomination',
            nominationId: nomination.id
          }
        }
      ]
    };

    // In a real implementation, this would send the adaptive card to Teams
    // For now, we'll just return success
    context.res = {
      status: 200,
      body: {
        success: true,
        message: 'Nomination notification sent successfully',
        adaptiveCard
      }
    };

  } catch (error) {
    console.error('Send nomination notification error:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to send nomination notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

export default httpTrigger; 