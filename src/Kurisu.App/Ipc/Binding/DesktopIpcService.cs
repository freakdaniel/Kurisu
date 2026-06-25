#pragma warning disable CS1591
using Kurisu.App.AppHost;
using Kurisu.App.Desktop.Bridges;
using Kurisu.App.Desktop.DirectConnect;
using Kurisu.App.Ipc.Attributes;
using Kurisu.Core.Models;

namespace Kurisu.App.Ipc.Binding;

/// <summary>
/// Represents the desktop IPC surface exposed to the renderer bridge.
/// </summary>
/// <param name="services">The services.</param>
/// <param name="desktopProjectionService">The desktop projection service.</param>
/// <param name="directConnectSessionService">The direct-connect session service.</param>
/// <param name="directConnectServerHost">The direct-connect server host.</param>
/// <param name="desktopWindowBridge">The native window bridge.</param>
public sealed class DesktopIpcService(
    IServiceProvider services,
    IDesktopSurface desktopProjectionService,
    IDirectConnectSessionService directConnectSessionService,
    IDirectConnectServerHost directConnectServerHost,
    IDesktopWindowBridge desktopWindowBridge) : IpcServiceBase(services)
{
    [IpcInvoke("kurisu-desktop:app:bootstrap")]
    public Task<AppBootstrapPayload> Bootstrap()
        => desktopProjectionService.GetBootstrapAsync();

    [IpcInvoke("kurisu-desktop:sessions:get")]
    public Task<DesktopSessionDetail?> GetSession(GetDesktopSessionRequest request)
        => desktopProjectionService.GetSessionAsync(request);

    [IpcInvoke("kurisu-desktop:sessions:remove")]
    public Task<RemoveDesktopSessionResult> RemoveSession(RemoveDesktopSessionRequest request)
        => desktopProjectionService.RemoveSessionAsync(request);

    [IpcInvoke("kurisu-desktop:sessions:rename")]
    public Task<RenameDesktopSessionResult> RenameSession(RenameDesktopSessionRequest request)
        => desktopProjectionService.RenameSessionAsync(request);

    [IpcInvoke("kurisu-desktop:sessions:get-active-turns")]
    public Task<IReadOnlyList<ActiveTurnState>> GetActiveTurns()
        => desktopProjectionService.GetActiveTurnsAsync();

    [IpcInvoke("kurisu-desktop:arena:get-active-sessions")]
    public Task<IReadOnlyList<ActiveArenaSessionState>> GetActiveArenaSessions()
        => desktopProjectionService.GetActiveArenaSessionsAsync();

    [IpcInvoke("kurisu-desktop:arena:cancel")]
    public Task<CancelArenaSessionResult> CancelArenaSession(CancelArenaSessionRequest request)
        => desktopProjectionService.CancelArenaSessionAsync(request);

    [IpcInvoke("kurisu-desktop:app:set-locale")]
    public Task<DesktopStateChangedEvent> SetLocale(SetLocaleRequest request)
        => desktopProjectionService.SetLocaleAsync(request.Locale);

    [IpcInvoke("kurisu-desktop:providers:list")]
    public Task<ProviderListSnapshot> ListProviders()
        => desktopProjectionService.GetProvidersAsync();

    [IpcInvoke("kurisu-desktop:providers:configure")]
    public Task<ProviderListSnapshot> ConfigureProvider(ConfigureProviderRequest request)
        => desktopProjectionService.ConfigureProviderAsync(request);

    [IpcInvoke("kurisu-desktop:providers:deconfigure")]
    public Task<ProviderListSnapshot> DeconfigureProvider(DeconfigureProviderRequest request)
        => desktopProjectionService.DeconfigureProviderAsync(request);

    [IpcInvoke("kurisu-desktop:auth:list-provider-models")]
    public Task<ListProviderModelsResponse> ListProviderModels(ListProviderModelsRequest request)
        => desktopProjectionService.ListProviderModelsAsync(request);

    [IpcInvoke("kurisu-desktop:channels:get-pairings")]
    public Task<ChannelPairingSnapshot> GetChannelPairings(GetChannelPairingRequest request)
        => desktopProjectionService.GetChannelPairingsAsync(request);

    [IpcInvoke("kurisu-desktop:channels:approve-pairing")]
    public Task<ChannelPairingSnapshot> ApproveChannelPairing(ApproveChannelPairingRequest request)
        => desktopProjectionService.ApproveChannelPairingAsync(request);

    [IpcInvoke("kurisu-desktop:workspace:get")]
    public Task<WorkspaceSnapshot> GetWorkspaceSnapshot()
        => desktopProjectionService.GetWorkspaceSnapshotAsync();

    [IpcInvoke("kurisu-desktop:workspace:create-git-checkpoint")]
    public Task<WorkspaceSnapshot> CreateGitCheckpoint(CreateGitCheckpointRequest request)
        => desktopProjectionService.CreateGitCheckpointAsync(request);

    [IpcInvoke("kurisu-desktop:workspace:restore-git-checkpoint")]
    public Task<WorkspaceSnapshot> RestoreGitCheckpoint(RestoreGitCheckpointRequest request)
        => desktopProjectionService.RestoreGitCheckpointAsync(request);

    [IpcInvoke("kurisu-desktop:workspace:create-managed-worktree")]
    public Task<WorkspaceSnapshot> CreateManagedWorktree(CreateManagedWorktreeRequest request)
        => desktopProjectionService.CreateManagedWorktreeAsync(request);

    [IpcInvoke("kurisu-desktop:workspace:cleanup-managed-session")]
    public Task<WorkspaceSnapshot> CleanupManagedSession(CleanupManagedWorktreeSessionRequest request)
        => desktopProjectionService.CleanupManagedSessionAsync(request);

    [IpcInvoke("kurisu-desktop:mcp:add")]
    public Task<McpSnapshot> AddMcpServer(McpServerRegistrationRequest request)
        => desktopProjectionService.AddMcpServerAsync(request);

    [IpcInvoke("kurisu-desktop:mcp:remove")]
    public Task<McpSnapshot> RemoveMcpServer(RemoveMcpServerRequest request)
        => desktopProjectionService.RemoveMcpServerAsync(request);

    [IpcInvoke("kurisu-desktop:mcp:reconnect")]
    public Task<McpSnapshot> ReconnectMcpServer(ReconnectMcpServerRequest request)
        => desktopProjectionService.ReconnectMcpServerAsync(request);

    [IpcInvoke("kurisu-desktop:prompts:get-registry")]
    public Task<PromptRegistrySnapshot> GetPromptRegistry(GetPromptRegistryRequest request)
        => desktopProjectionService.GetPromptRegistryAsync(request);

    [IpcInvoke("kurisu-desktop:prompts:invoke")]
    public Task<McpPromptInvocationResult> InvokeRegisteredPrompt(InvokePromptRegistryEntryRequest request)
        => desktopProjectionService.InvokeRegisteredPromptAsync(request);

    [IpcInvoke("kurisu-desktop:mcp-resources:get-registry")]
    public Task<McpResourceRegistrySnapshot> GetMcpResourceRegistry(GetMcpResourceRegistryRequest request)
        => desktopProjectionService.GetMcpResourceRegistryAsync(request);

    [IpcInvoke("kurisu-desktop:mcp-resources:read")]
    public Task<McpResourceReadResult> ReadRegisteredMcpResource(ReadMcpResourceRegistryEntryRequest request)
        => desktopProjectionService.ReadRegisteredMcpResourceAsync(request);

    [IpcInvoke("kurisu-desktop:extensions:get-settings")]
    public Task<ExtensionSettingsSnapshot> GetExtensionSettings(GetExtensionSettingsRequest request)
        => desktopProjectionService.GetExtensionSettingsAsync(request);

    [IpcInvoke("kurisu-desktop:extensions:install")]
    public Task<ExtensionSnapshot> InstallExtension(InstallExtensionRequest request)
        => desktopProjectionService.InstallExtensionAsync(request);

    [IpcInvoke("kurisu-desktop:extensions:preview-consent")]
    public Task<ExtensionConsentSnapshot> PreviewExtensionConsent(InstallExtensionRequest request)
        => desktopProjectionService.PreviewExtensionConsentAsync(request);

    [IpcInvoke("kurisu-desktop:extensions:create-scaffold")]
    public Task<ExtensionScaffoldSnapshot> CreateExtensionScaffold(CreateExtensionScaffoldRequest request)
        => desktopProjectionService.CreateExtensionScaffoldAsync(request);

    [IpcInvoke("kurisu-desktop:extensions:update")]
    public Task<ExtensionSnapshot> UpdateExtension(UpdateExtensionRequest request)
        => desktopProjectionService.UpdateExtensionAsync(request);

    [IpcInvoke("kurisu-desktop:extensions:set-setting")]
    public Task<ExtensionSettingsSnapshot> SetExtensionSetting(SetExtensionSettingValueRequest request)
        => desktopProjectionService.SetExtensionSettingAsync(request);

    [IpcInvoke("kurisu-desktop:extensions:set-enabled")]
    public Task<ExtensionSnapshot> SetExtensionEnabled(SetExtensionEnabledRequest request)
        => desktopProjectionService.SetExtensionEnabledAsync(request);

    [IpcInvoke("kurisu-desktop:extensions:remove")]
    public Task<ExtensionSnapshot> RemoveExtension(RemoveExtensionRequest request)
        => desktopProjectionService.RemoveExtensionAsync(request);

    [IpcInvoke("kurisu-desktop:tools:execute-native")]
    public Task<NativeToolExecutionResult> ExecuteNativeTool(ExecuteNativeToolRequest request)
        => desktopProjectionService.ExecuteNativeToolAsync(request);

    [IpcInvoke("kurisu-desktop:sessions:start-turn")]
    public Task<DesktopSessionTurnResult> StartSessionTurn(StartDesktopSessionTurnRequest request)
        => desktopProjectionService.StartSessionTurnAsync(request);

    [IpcInvoke("kurisu-desktop:sessions:approve-tool")]
    public Task<DesktopSessionTurnResult> ApprovePendingTool(ApproveDesktopSessionToolRequest request)
        => desktopProjectionService.ApprovePendingToolAsync(request);

    [IpcInvoke("kurisu-desktop:sessions:answer-question")]
    public Task<DesktopSessionTurnResult> AnswerPendingQuestion(AnswerDesktopSessionQuestionRequest request)
        => desktopProjectionService.AnswerPendingQuestionAsync(request);

    [IpcInvoke("kurisu-desktop:sessions:cancel-turn")]
    public Task<CancelDesktopSessionTurnResult> CancelSessionTurn(CancelDesktopSessionTurnRequest request)
        => desktopProjectionService.CancelSessionTurnAsync(request);

    [IpcInvoke("kurisu-desktop:sessions:resume-interrupted")]
    public Task<DesktopSessionTurnResult> ResumeInterruptedTurn(ResumeInterruptedTurnRequest request)
        => desktopProjectionService.ResumeInterruptedTurnAsync(request);

    [IpcInvoke("kurisu-desktop:sessions:dismiss-interrupted")]
    public Task<DismissInterruptedTurnResult> DismissInterruptedTurn(DismissInterruptedTurnRequest request)
        => desktopProjectionService.DismissInterruptedTurnAsync(request);

    [IpcInvoke("kurisu-desktop:direct-connect:create-session")]
    public Task<DirectConnectSessionState> CreateDirectConnectSession(CreateDirectConnectSessionRequest request)
        => directConnectSessionService.CreateSessionAsync(request);

    [IpcInvoke("kurisu-desktop:direct-connect:get-server")]
    public Task<DirectConnectServerState> GetDirectConnectServer()
        => Task.FromResult(directConnectServerHost.State);

    [IpcInvoke("kurisu-desktop:direct-connect:list-sessions")]
    public Task<IReadOnlyList<DirectConnectSessionState>> ListDirectConnectSessions()
        => directConnectSessionService.ListSessionsAsync();

    [IpcInvoke("kurisu-desktop:direct-connect:get-session")]
    public Task<DirectConnectSessionState?> GetDirectConnectSession(GetDirectConnectSessionRequest request)
        => directConnectSessionService.GetSessionAsync(request.DirectConnectSessionId);

    [IpcInvoke("kurisu-desktop:direct-connect:read-events")]
    public Task<DirectConnectSessionEventBatch> ReadDirectConnectSessionEvents(ReadDirectConnectSessionEventsRequest request)
        => directConnectSessionService.ReadEventsAsync(
            request.DirectConnectSessionId,
            request.AfterSequence,
            request.MaxCount);

    [IpcInvoke("kurisu-desktop:direct-connect:start-turn")]
    public Task<DesktopSessionTurnResult> StartDirectConnectSessionTurn(StartDirectConnectSessionTurnRequest request)
        => directConnectSessionService.StartTurnAsync(request.DirectConnectSessionId, request.Turn);

    [IpcInvoke("kurisu-desktop:direct-connect:approve-tool")]
    public Task<DesktopSessionTurnResult> ApproveDirectConnectSessionTool(ApproveDirectConnectSessionToolRequest request)
        => directConnectSessionService.ApprovePendingToolAsync(request.DirectConnectSessionId, request.Approval);

    [IpcInvoke("kurisu-desktop:direct-connect:answer-question")]
    public Task<DesktopSessionTurnResult> AnswerDirectConnectSessionQuestion(AnswerDirectConnectSessionQuestionRequest request)
        => directConnectSessionService.AnswerPendingQuestionAsync(request.DirectConnectSessionId, request.Answer);

    [IpcInvoke("kurisu-desktop:direct-connect:cancel-turn")]
    public Task<CancelDesktopSessionTurnResult> CancelDirectConnectSessionTurn(CancelDirectConnectSessionTurnRequest request)
        => directConnectSessionService.CancelTurnAsync(request.DirectConnectSessionId, request.Turn);

    [IpcInvoke("kurisu-desktop:direct-connect:resume-interrupted")]
    public Task<DesktopSessionTurnResult> ResumeDirectConnectSessionTurn(ResumeDirectConnectSessionTurnRequest request)
        => directConnectSessionService.ResumeInterruptedTurnAsync(request.DirectConnectSessionId, request.Turn);

    [IpcInvoke("kurisu-desktop:direct-connect:dismiss-interrupted")]
    public Task<DismissInterruptedTurnResult> DismissDirectConnectSessionTurn(DismissDirectConnectSessionTurnRequest request)
        => directConnectSessionService.DismissInterruptedTurnAsync(request.DirectConnectSessionId, request.Turn);

    [IpcInvoke("kurisu-desktop:direct-connect:close-session")]
    public Task<DirectConnectSessionState> CloseDirectConnectSession(CloseDirectConnectSessionRequest request)
        => directConnectSessionService.CloseSessionAsync(request.DirectConnectSessionId);

    [IpcInvoke("kurisu-desktop:workspace:select-project-directory")]
    public Task<SelectProjectDirectoryResult> SelectProjectDirectory()
        => desktopWindowBridge.SelectProjectDirectoryAsync();

    [IpcInvoke("kurisu-desktop:followup:get-suggestions")]
    public Task<FollowupSuggestionSnapshot> GetFollowupSuggestions(GetFollowupSuggestionsRequest request)
        => desktopProjectionService.GetFollowupSuggestionsAsync(request);

    [IpcEvent("kurisu-desktop:app:state-changed")]
    public void SubscribeStateChanged(Action<DesktopStateChangedEvent> emit) 
        => desktopProjectionService.StateChanged += (_, state) => emit(state);

    [IpcEvent("kurisu-desktop:auth:changed")]
    public void SubscribeAuthChanged(Action<ProviderListSnapshot> emit) 
        => desktopProjectionService.AuthChanged += (_, state) => emit(state);

    [IpcEvent("kurisu-desktop:sessions:event")]
    public void SubscribeSessionEvents(Action<DesktopSessionEvent> emit) 
        => desktopProjectionService.SessionEvent += (_, sessionEvent) => emit(sessionEvent);

    [IpcEvent("kurisu-desktop:arena:event")]
    public void SubscribeArenaEvents(Action<ArenaSessionEvent> emit) 
        => desktopProjectionService.ArenaEvent += (_, arenaEvent) => emit(arenaEvent);
}
#pragma warning restore CS1591
