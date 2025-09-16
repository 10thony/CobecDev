export interface AdaptiveCardAction {
  type: 'Action.Submit' | 'Action.OpenUrl' | 'Action.ShowCard';
  title: string;
  data?: any;
  url?: string;
}

export interface AdaptiveCardFact {
  title: string;
  value: string;
}

export interface AdaptiveCard {
  type: 'AdaptiveCard';
  version: string;
  body: any[];
  actions?: AdaptiveCardAction[];
}

export class AdaptiveCardBuilder {
  private card: AdaptiveCard;

  constructor() {
    this.card = {
      type: 'AdaptiveCard',
      version: '1.3',
      body: [],
      actions: []
    };
  }

  addTextBlock(text: string, options: {
    size?: 'Small' | 'Default' | 'Medium' | 'Large' | 'ExtraLarge';
    weight?: 'Default' | 'Lighter' | 'Bolder';
    color?: 'Default' | 'Dark' | 'Light' | 'Accent' | 'Good' | 'Warning' | 'Attention';
    isSubtle?: boolean;
    wrap?: boolean;
  } = {}): AdaptiveCardBuilder {
    this.card.body.push({
      type: 'TextBlock',
      text,
      size: options.size || 'Default',
      weight: options.weight || 'Default',
      color: options.color || 'Default',
      isSubtle: options.isSubtle || false,
      wrap: options.wrap !== false
    });
    return this;
  }

  addFactSet(facts: AdaptiveCardFact[]): AdaptiveCardBuilder {
    this.card.body.push({
      type: 'FactSet',
      facts: facts.map(fact => ({
        title: fact.title,
        value: fact.value
      }))
    });
    return this;
  }

  addImage(url: string, options: {
    altText?: string;
    size?: 'Auto' | 'Stretch' | 'Small' | 'Medium' | 'Large';
    style?: 'Default' | 'Person';
  } = {}): AdaptiveCardBuilder {
    this.card.body.push({
      type: 'Image',
      url,
      altText: options.altText || '',
      size: options.size || 'Auto',
      style: options.style || 'Default'
    });
    return this;
  }

  addAction(action: AdaptiveCardAction): AdaptiveCardBuilder {
    if (!this.card.actions) {
      this.card.actions = [];
    }
    this.card.actions.push(action);
    return this;
  }

  addSubmitAction(title: string, data: any): AdaptiveCardBuilder {
    return this.addAction({
      type: 'Action.Submit',
      title,
      data
    });
  }

  addOpenUrlAction(title: string, url: string): AdaptiveCardBuilder {
    return this.addAction({
      type: 'Action.OpenUrl',
      title,
      url
    });
  }

  addColumnSet(columns: any[]): AdaptiveCardBuilder {
    this.card.body.push({
      type: 'ColumnSet',
      columns: columns.map(column => ({
        type: 'Column',
        width: column.width || 'Auto',
        items: column.items || []
      }))
    });
    return this;
  }

  addContainer(items: any[], options: {
    style?: 'Default' | 'Emphasis' | 'Good' | 'Attention' | 'Warning' | 'Accent';
    bleed?: boolean;
    separator?: boolean;
  } = {}): AdaptiveCardBuilder {
    this.card.body.push({
      type: 'Container',
      items,
      style: options.style || 'Default',
      bleed: options.bleed || false,
      separator: options.separator || false
    });
    return this;
  }

  build(): AdaptiveCard {
    return { ...this.card };
  }

  // Pre-built card templates
  static createNominationCard(nomination: {
    id: string;
    employeeName: string;
    nominatedBy: string;
    reason: string;
    date: string;
  }): AdaptiveCard {
    return new AdaptiveCardBuilder()
      .addTextBlock('New Employee Nomination', {
        size: 'Large',
        weight: 'Bolder',
        color: 'Accent'
      })
      .addFactSet([
        { title: 'Employee', value: nomination.employeeName },
        { title: 'Nominated By', value: nomination.nominatedBy },
        { title: 'Reason', value: nomination.reason },
        { title: 'Date', value: new Date(nomination.date).toLocaleDateString() }
      ])
      .addSubmitAction('Approve', {
        action: 'approve',
        nominationId: nomination.id
      })
      .addSubmitAction('Reject', {
        action: 'reject',
        nominationId: nomination.id
      })
      .build();
  }

  static createJobMatchCard(jobMatch: {
    id: string;
    title: string;
    company: string;
    location: string;
    matchScore: number;
  }): AdaptiveCard {
    return new AdaptiveCardBuilder()
      .addTextBlock('Job Match Found', {
        size: 'Large',
        weight: 'Bolder',
        color: 'Good'
      })
      .addFactSet([
        { title: 'Position', value: jobMatch.title },
        { title: 'Company', value: jobMatch.company },
        { title: 'Location', value: jobMatch.location },
        { title: 'Match Score', value: `${jobMatch.matchScore}%` }
      ])
      .addSubmitAction('View Details', {
        action: 'viewJob',
        jobId: jobMatch.id
      })
      .addSubmitAction('Apply Now', {
        action: 'applyJob',
        jobId: jobMatch.id
      })
      .build();
  }

  static createDataUploadCard(uploadResult: {
    id: string;
    fileName: string;
    recordsProcessed: number;
    type: string;
    status: string;
  }): AdaptiveCard {
    return new AdaptiveCardBuilder()
      .addTextBlock('Data Upload Complete', {
        size: 'Large',
        weight: 'Bolder',
        color: 'Good'
      })
      .addFactSet([
        { title: 'File Name', value: uploadResult.fileName },
        { title: 'Records Processed', value: uploadResult.recordsProcessed.toString() },
        { title: 'Type', value: uploadResult.type },
        { title: 'Status', value: uploadResult.status }
      ])
      .addSubmitAction('View Data', {
        action: 'viewData',
        uploadId: uploadResult.id
      })
      .build();
  }

  static createErrorCard(error: {
    title: string;
    message: string;
    action?: string;
  }): AdaptiveCard {
    return new AdaptiveCardBuilder()
      .addTextBlock(error.title, {
        size: 'Large',
        weight: 'Bolder',
        color: 'Attention'
      })
      .addTextBlock(error.message, {
        wrap: true
      })
      .addSubmitAction('Try Again', {
        action: error.action || 'retry'
      })
      .build();
  }

  static createSuccessCard(success: {
    title: string;
    message: string;
    action?: string;
  }): AdaptiveCard {
    return new AdaptiveCardBuilder()
      .addTextBlock(success.title, {
        size: 'Large',
        weight: 'Bolder',
        color: 'Good'
      })
      .addTextBlock(success.message, {
        wrap: true
      })
      .addSubmitAction('Continue', {
        action: success.action || 'continue'
      })
      .build();
  }

  static createWelcomeCard(user: {
    displayName: string;
    email: string;
  }): AdaptiveCard {
    return new AdaptiveCardBuilder()
      .addTextBlock('Welcome to Cobecium Teams Widget', {
        size: 'Large',
        weight: 'Bolder',
        color: 'Accent'
      })
      .addTextBlock(`Hello ${user.displayName}!`, {
        size: 'Medium',
        weight: 'Bolder'
      })
      .addTextBlock('AI-powered job and resume matching for Microsoft Teams', {
        isSubtle: true,
        wrap: true
      })
      .addFactSet([
        { title: 'User', value: user.displayName },
        { title: 'Email', value: user.email }
      ])
      .addSubmitAction('Get Started', {
        action: 'getStarted'
      })
      .build();
  }
} 