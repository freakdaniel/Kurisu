import type {
  AppBootstrapPayload as GeneratedAppBootstrapPayload,
  DesktopQuestionAnswer,
  DesktopQuestionPrompt,
  DesktopSessionActivitySummary as GeneratedDesktopSessionActivitySummary,
  DesktopSessionDetail as GeneratedDesktopSessionDetail,
  DesktopSessionEntry as GeneratedDesktopSessionEntry,
  DesktopSessionEvent as GeneratedDesktopSessionEvent,
  DesktopStateChangedEvent,
  KurisuDesktopBridge,
  SessionPreview,
} from './ipc.generated'

export type {
  ActiveTurnState,
  AdoptionPattern,
  AnswerDesktopSessionQuestionRequest,
  ApprovalProfile,
  ApproveChannelPairingRequest,
  CleanupManagedWorktreeSessionRequest,
  ConfigureProviderRequest,
  DeconfigureProviderRequest,
  ListProviderModelsRequest,
  ListProviderModelsResponse,
  ProviderPresetSnapshot,
  ProviderStatusSnapshot,
  ProviderListSnapshot,
  CreateGitCheckpointRequest,
  CancelDesktopSessionTurnRequest,
  CancelDesktopSessionTurnResult,
  CapabilityLane,
  ChannelDefinition,
  ChannelPairingRequest,
  ChannelPairingSnapshot,
  ChannelSnapshot,
  CreateManagedWorktreeRequest,
  DesktopQuestionAnswer,
  DesktopQuestionOption,
  DesktopQuestionPrompt,
  DirectConnectServerState,
  DirectConnectSessionState,
  ExecuteNativeToolRequest,
  ExtensionDefinition,
  ExtensionSettingsSnapshot,
  ExtensionSettingValue,
  ExtensionSnapshot,
  GetChannelPairingRequest,
  GetDesktopSessionRequest,
  GetExtensionSettingsRequest,
  DesktopMode,
  DesktopSessionEventKind,
  DesktopStateChangedEvent,
  LocaleOption,
  McpServerDefinition,
  McpServerRegistrationRequest,
  McpSnapshot,
  ProjectSummarySnapshot,
  RemoveMcpServerRequest,
  ReconnectMcpServerRequest,
  KurisuCommandSurface,
  KurisuCompatibilityLayer,
  KurisuCompatibilitySnapshot,
  NativeToolExecutionResult,
  NativeToolHostSnapshot,
  NativeToolRegistration,
  RemoveDesktopSessionRequest,
  RemoveDesktopSessionResult,
  RenameDesktopSessionRequest,
  RenameDesktopSessionResult,
  KurisuRuntimeProfile,
  RecoverableTurnState,
  ResolvedCommand,
  RestoreGitCheckpointRequest,
  KurisuSkillSurface,
  ToolCatalogSnapshot,
  ToolDescriptor,
  AvailableModel,
  RuntimeModelCapabilities,
  RuntimeModelSnapshot,
  SessionPreview,
  DesktopSessionTurnResult,
  WorkspaceSnapshot,
  GitRepositorySnapshot,
  GitWorktreeEntry,
  FileDiscoverySnapshot,
  GitCheckpointSnapshot,
  GitHistorySnapshot,
  KurisuSurfaceDirectory,
  ResearchTrack,
  InstallExtensionRequest,
  RemoveExtensionRequest,
  SetExtensionEnabledRequest,
  SetExtensionSettingValueRequest,
  StartDesktopSessionTurnRequest,
} from './ipc.generated'

export type DesktopSessionActivitySummary = Omit<GeneratedDesktopSessionActivitySummary, 'commandCount'> & {
  commandCount: number
  toolCount: number
}

export type DesktopSessionEntry =
  Omit<GeneratedDesktopSessionEntry, 'thinkingDurationMs'> & {
    thinkingDurationMs?: number
  }

export type DesktopSessionDetail =
  Omit<GeneratedDesktopSessionDetail, 'session' | 'entries' | 'summary'> & {
    session: SessionPreview
    entries: DesktopSessionEntry[]
    summary: DesktopSessionActivitySummary
  }

export type DesktopSessionEvent =
  GeneratedDesktopSessionEvent & {
    toolOutput?: string
    approvalState?: string
    changedFiles?: string[]
    questions?: DesktopQuestionPrompt[]
    answers?: DesktopQuestionAnswer[]
  }

export type AppBootstrapPayload =
  GeneratedAppBootstrapPayload

export interface DesktopBridge extends Omit<KurisuDesktopBridge, 'setLocale'> {
  setLocale: (locale: string) => Promise<DesktopStateChangedEvent>
  openExternalUrl?: (url: string) => Promise<boolean>
}

declare global {
  interface Window {
    kurisuDesktop?: DesktopBridge
  }
}

export {}
