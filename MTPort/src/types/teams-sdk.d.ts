// Microsoft Teams SDK Type Declarations
declare global {
  interface Window {
    microsoftTeams?: {
      initialize: (callback?: () => void) => void;
      getContext: (callback: (context: any) => void) => void;
      registerOnThemeChangeHandler: (handler: (theme: string) => void) => void;
      unregisterOnThemeChangeHandler: (handler: (theme: string) => void) => void;
      registerOnLoadHandler: (handler: () => void) => void;
      unregisterOnLoadHandler: (handler: () => void) => void;
      app: {
        getContext: () => Promise<any>;
        initialize: () => Promise<void>;
        notifySuccess: () => void;
        notifyFailure: (reason: string, callback?: () => void) => void;
        notifyExpectedFailure: (reason: string, callback?: () => void) => void;
      };
      pages: {
        backStack: {
          navigateBack: () => void;
          navigateToTab: (tabInstance: any) => void;
        };
        config: {
          registerOnSaveHandler: (handler: (evt: any) => void) => void;
          registerOnRemoveHandler: (handler: (evt: any) => void) => void;
          setValidityState: (validityState: boolean) => void;
          getConfig: (callback: (config: any) => void) => void;
          setConfig: (config: any) => void;
        };
        fullTrust: {
          enterFullscreen: () => void;
          exitFullscreen: () => void;
        };
        sharing: {
          shareWebContent: (webContentInfo: any) => void;
          shareDeepLink: (deepLinkParameters: any) => void;
        };
        tabs: {
          getTabInstances: (callback: (tabInfo: any) => void, tabInstanceParameters?: any) => void;
          getMruTabInstances: (callback: (tabInfo: any) => void, tabInstanceParameters?: any) => void;
          navigateToTab: (tabInstance: any) => void;
          navigateToDefaultTab: () => void;
        };
      };
      teamsCore: {
        enablePrintCapability: () => void;
        print: () => void;
      };
      media: {
        captureImage: (callback: (error: any, files: any[]) => void, imageProperties?: any) => void;
        selectMedia: (callback: (error: any, attachments: any[]) => void, mediaInputs: any) => void;
        viewImages: (uriList: string[], callback?: (error: any) => void) => void;
        scanBarCode: (callback: (error: any, text: string) => void, config?: any) => void;
      };
      location: {
        getLocation: (callback: (error: any, location: any) => void, locationProps?: any) => void;
        showLocation: (location: any, callback?: (error: any, status: boolean) => void) => void;
        chooseLocation: (callback: (error: any, location: any) => void) => void;
      };
      meeting: {
        getMeetingDetails: (callback: (error: any, meetingDetails: any) => void) => void;
        getInMeetingClientLocation: (callback: (error: any, clientLocation: any) => void) => void;
        shareAppContentToStage: (callback: (error: any, result: any) => void, appContentUrl: string) => void;
        addOrUpdateBot: (callback: (error: any, result: any) => void, botUrl: string, botId: string, botName: string) => void;
      };
      call: {
        startCall: (callback: (error: any, result: any) => void, startCallParams: any) => void;
        endCall: (callback: (error: any, result: any) => void) => void;
        mute: (callback: (error: any, result: any) => void) => void;
        unmute: (callback: (error: any, result: any) => void) => void;
        isSupported: (callback: (error: any, result: any) => void) => void;
      };
      chat: {
        openChat: (callback: (error: any, result: any) => void, chatParameters: any) => void;
        sendMessageToChat: (callback: (error: any, result: any) => void, chatId: string, message: any) => void;
      };
      calendar: {
        openCalendarItem: (callback: (error: any, result: any) => void, openCalendarItemParams: any) => void;
        composeMeeting: (callback: (error: any, result: any) => void, meetingParameters: any) => void;
      };
      mail: {
        openMailItem: (callback: (error: any, result: any) => void, openMailItemParams: any) => void;
        composeMail: (callback: (error: any, result: any) => void, composeMailParams: any) => void;
      };
      tasks: {
        startTask: (callback: (error: any, result: any) => void, taskInfo: any, submitHandler?: (err: any, result: any) => void) => void;
        submitTask: (callback: (error: any, result: any) => void, result?: any, appIds?: string[]) => void;
        updateTask: (callback: (error: any, result: any) => void, taskInfo: any) => void;
      };
      profile: {
        showProfile: (callback: (error: any, result: any) => void, showProfileRequest: any) => void;
        selectPeople: (callback: (error: any, result: any) => void, selectPeopleInputs: any) => void;
        getProfile: (callback: (error: any, profile: any) => void, profileRequest: any) => void;
      };
      secondaryBrowser: {
        open: (callback: (error: any, result: any) => void, url: string) => void;
        close: (callback: (error: any, result: any) => void) => void;
      };
      appButton: {
        onClick: (callback: (error: any, result: any) => void) => void;
        onHoverEnter: (callback: (error: any, result: any) => void) => void;
        onHoverLeave: (callback: (error: any, result: any) => void) => void;
      };
      appEntity: {
        selectAppEntity: (callback: (error: any, result: any) => void, appEntityParameters: any) => void;
      };
      barCode: {
        scanBarCode: (callback: (error: any, result: any) => void, config?: any) => void;
      };
      clipboard: {
        readText: (callback: (error: any, text: string) => void) => void;
        writeText: (callback: (error: any, result: any) => void, text: string) => void;
      };
      conversations: {
        openConversation: (callback: (error: any, result: any) => void, openConversationRequest: any) => void;
        closeConversation: (callback: (error: any, result: any) => void) => void;
        getChatMembers: (callback: (error: any, members: any[]) => void) => void;
        getChatThreadMembers: (callback: (error: any, members: any[]) => void) => void;
        addMemberToChat: (callback: (error: any, result: any) => void, member: any) => void;
        addMemberToChatThread: (callback: (error: any, result: any) => void, member: any) => void;
        removeMemberFromChat: (callback: (error: any, result: any) => void, member: any) => void;
        removeMemberFromChatThread: (callback: (error: any, result: any) => void, member: any) => void;
      };
      dialog: {
        open: (callback: (error: any, result: any) => void, url: string, dialogInfo?: any) => void;
        submit: (callback: (error: any, result: any) => void, result?: any, appIds?: string[]) => void;
        close: (callback: (error: any, result: any) => void, result?: any, appIds?: string[]) => void;
        resize: (callback: (error: any, result: any) => void, width: number, height: number) => void;
        update: (callback: (error: any, result: any) => void, dialogInfo: any) => void;
      };
      stage: {
        open: (callback: (error: any, result: any) => void, stageViewParameters: any) => void;
        close: (callback: (error: any, result: any) => void) => void;
      };
      video: {
        isSupported: (callback: (error: any, result: any) => void) => void;
        mediaController: {
          getSupportedMediaControllerInputs: (callback: (error: any, mediaInputs: any[]) => void) => void;
          getSelectedMediaControllerInputs: (callback: (error: any, mediaInputs: any[]) => void) => void;
          setMediaControllerInputs: (callback: (error: any, result: any) => void, mediaInputs: any[]) => void;
          stopSharingMediaControllerInputs: (callback: (error: any, result: any) => void) => void;
        };
      };
      webStorage: {
        getData: (callback: (error: any, value: any) => void, key: string) => void;
        setData: (callback: (error: any, result: any) => void, key: string, value: any) => void;
        deleteData: (callback: (error: any, result: any) => void, key: string) => void;
      };
      logs: {
        registerGetLogHandler: (handler: (callback: (error: any, log: string) => void) => void) => void;
        setLogLevel: (callback: (error: any, result: any) => void, logLevel: any) => void;
        getLogLevel: (callback: (error: any, logLevel: any) => void) => void;
      };
      monetization: {
        openPurchaseExperience: (callback: (error: any, result: any) => void, purchaseExperienceRequest: any) => void;
        showPurchaseExperience: (callback: (error: any, result: any) => void, purchaseExperienceRequest: any) => void;
      };
      people: {
        selectPeople: (callback: (error: any, people: any[]) => void, selectPeopleInputs?: any) => void;
        getPeople: (callback: (error: any, people: any[]) => void, getPeopleInputs: any) => void;
        getMyPresence: (callback: (error: any, presence: any) => void) => void;
        getPresence: (callback: (error: any, presence: any) => void, getPresenceInputs: any) => void;
        setMyPresence: (callback: (error: any, result: any) => void, presence: any) => void;
      };
      search: {
        querySearch: (callback: (error: any, result: any) => void, searchRequest: any) => void;
        registerOnSearchHandler: (handler: (searchTerm: string) => void) => void;
        updateSearchQuery: (callback: (error: any, result: any) => void, searchRequest: any) => void;
      };
      settings: {
        getSettings: (callback: (error: any, settings: any) => void) => void;
        setSettings: (callback: (error: any, result: any) => void, settings: any) => void;
        registerOnSaveHandler: (handler: (evt: any) => void) => void;
        registerOnRemoveHandler: (handler: (evt: any) => void) => void;
        setValidityState: (validityState: boolean) => void;
      };
      teams: {
        getTeamChannels: (callback: (error: any, channels: any[]) => void, groupId: string) => void;
        getContext: (callback: (error: any, context: any) => void) => void;
        joinChannel: (callback: (error: any, result: any) => void, channelInfo: any) => void;
        getUserJoinedTeams: (callback: (error: any, userJoinedTeams: any[]) => void) => void;
        selectChannel: (callback: (error: any, result: any) => void, channelInfo: any) => void;
        getChannelConfig: (callback: (error: any, config: any) => void) => void;
        getConfigurableTab: (callback: (error: any, configurableTab: any) => void) => void;
        navigateToTab: (callback: (error: any, result: any) => void, tabInstance: any) => void;
        setConfig: (callback: (error: any, result: any) => void, config: any) => void;
        getTabInstances: (callback: (error: any, tabInfo: any) => void, tabInstanceParameters?: any) => void;
        getMruTabInstances: (callback: (error: any, tabInfo: any) => void, tabInstanceParameters?: any) => void;
        shareDeepLink: (callback: (error: any, result: any) => void, deepLinkParameters: any) => void;
        executeDeepLink: (callback: (error: any, result: any) => void, deepLink: string) => void;
        getAppContent: (callback: (error: any, appContent: any) => void) => void;
        getConfig: (callback: (error: any, config: any) => void) => void;
        setConfig: (callback: (error: any, result: any) => void, config: any) => void;
        registerOnThemeChangeHandler: (handler: (theme: string) => void) => void;
        registerOnLoadHandler: (handler: () => void) => void;
        registerBeforeUnloadHandler: (handler: (readyToUnload: () => void) => void) => void;
        enablePrintCapability: () => void;
        print: () => void;
        getTabInstances: (callback: (error: any, tabInfo: any) => void, tabInstanceParameters?: any) => void;
        getMruTabInstances: (callback: (error: any, tabInfo: any) => void, tabInstanceParameters?: any) => void;
        navigateToTab: (callback: (error: any, result: any) => void, tabInstance: any) => void;
        navigateToDefaultTab: (callback: (error: any, result: any) => void) => void;
      };
    };
  }

  const microsoftTeams: Window['microsoftTeams'];
}

export {}; 