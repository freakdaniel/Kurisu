using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Kurisu.App.AppHost;
using Kurisu.App.Desktop.Bridges;
using Kurisu.App.Desktop.DirectConnect;
using Kurisu.App.Desktop.State;
using Kurisu.App.Ipc.Binding;
using Kurisu.Core.Agents;
using Kurisu.Core.Auth;
using Kurisu.Core.Channels;
using Kurisu.Core.Compatibility;
using Kurisu.Core.Config;
using Kurisu.Core.Extensions;
using Kurisu.Core.Followup;
using Kurisu.Core.Hooks;
using Kurisu.Core.Ide;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Mcp;
using Kurisu.Core.Models;
using Kurisu.Core.Output;
using Kurisu.Core.Permissions;
using Kurisu.Core.Prompts;
using Kurisu.Core.Runtime;
using Kurisu.Core.Runtime.Providers;
using Kurisu.Core.Sessions;
using Kurisu.Core.Sessions.Memory;
using Kurisu.Core.Sessions.Persistence;
using Kurisu.Core.Telemetry;
using Kurisu.Core.Tools;

namespace Kurisu.App.AppHost.Composition;

/// <summary>
/// Single entry point for wiring up the Kurisu application. Consolidates the
/// 20+ per-feature <c>*ServiceCollectionExtensions.cs</c> files into one
/// file so the full DI graph is visible at a glance. Sections are grouped by
/// Options, Core domain services, Desktop bridges, and App host infrastructure.
/// </summary>
public static class AppComposition
{
    /// <summary>
    /// Wires the entire Kurisu desktop host: configuration-bound options,
    /// Core domain services, the desktop bridges that adapt Core to the IPC
    /// surface, and the host-side infrastructure (IPC dispatch, Electron
    /// bridge, window bridge).
    /// </summary>
    public static IServiceCollection AddKurisu(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        return services
            .AddKurisuOptions(configuration)
            .AddKurisuCore()
            .AddKurisuDesktop();
    }

    /// <summary>
    /// Adds configuration-bound options classes only.
    /// </summary>
    public static IServiceCollection AddKurisuOptions(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        #region Options
        services.AddOptions<DesktopShellOptions>()
            .Bind(configuration.GetSection(DesktopShellOptions.SectionName));
        services.AddOptions<NativeAssistantRuntimeOptions>()
            .Bind(configuration.GetSection(NativeAssistantRuntimeOptions.SectionName));
        services.AddOptions<DirectConnectServerOptions>()
            .Bind(configuration.GetSection(DirectConnectServerOptions.SectionName));
        #endregion
        return services;
    }

    /// <summary>
    /// Adds the Core domain services used by both the desktop host and tests.
    /// </summary>
    public static IServiceCollection AddKurisuCore(this IServiceCollection services)
    {
        #region Infrastructure
        services.AddSingleton<IDesktopEnvironmentPaths, DesktopEnvironmentPaths>();
        services.AddSingleton<IWorkspacePathResolver, WorkspacePathResolver>();
        services.AddSingleton<IGitCliService, GitCliService>();
        services.AddSingleton<IGitHistoryService, GitHistoryService>();
        services.AddSingleton<IGitWorktreeService, GitWorktreeService>();
        services.AddSingleton<IFileDiscoveryService, FileDiscoveryService>();
        services.AddSingleton<IWorkspaceInspectionService, WorkspaceInspectionService>();
        #endregion

        #region Config
        services.AddSingleton<IConfigService, RuntimeConfigService>();
        services.AddSingleton<RuntimeSelectionStore>();
        #endregion

        #region Providers
        services.AddHttpClient();
        services.AddSingleton<ProviderSettingsStore>();
        services.AddSingleton<ProviderHealthChecker>();
        #endregion

        #region Sessions (SQLite metadata + vector index)
        services.AddSingleton<SessionsDb>(sp =>
        {
            var profile = sp.GetRequiredService<KurisuRuntimeProfileService>();
            var paths = sp.GetRequiredService<WorkspacePaths>();
            var runtime = profile.Inspect(paths);
            var db = new SessionsDb(KurisuPaths.SessionsDbPath(runtime));
            return db;
        });
        services.AddSingleton<VectorsDb>(sp =>
        {
            var profile = sp.GetRequiredService<KurisuRuntimeProfileService>();
            var paths = sp.GetRequiredService<WorkspacePaths>();
            var runtime = profile.Inspect(paths);
            var dims = 1536; // matches text-embedding-v4 default
            return new VectorsDb(KurisuPaths.VectorsDbPath(runtime), dims);
        });
        services.AddSingleton<EmbeddingIndexer>();
        services.AddSingleton<SessionMemoryRetriever>();
        services.AddSingleton<SessionsMigration>();
        services.AddHostedService<SessionsMigrationHostedService>();
        #endregion

        #region Auth
        services.AddSingleton<IAuthUrlLauncher, ShellAuthUrlLauncher>();
        #endregion

        #region Channels
        services.TryAddSingleton<HttpClient>();
        services.AddSingleton<IChannelRegistryService, ChannelRegistryService>();
        services.AddSingleton<IChannelPluginRegistryService, ChannelPluginRegistryService>();
        services.AddSingleton<IChannelPluginRuntimeService, ChannelPluginRuntimeService>();
        services.AddSingleton<IChannelSessionRouter, ChannelSessionRouterService>();
        services.AddSingleton<IChannelAdapter, TelegramChannelAdapter>();
        services.AddSingleton<IChannelAdapter, WeixinChannelAdapter>();
        services.AddSingleton<IChannelAdapter, DingtalkChannelAdapter>();
        services.AddSingleton<IChannelRuntimeService, ChannelRuntimeService>();
        services.AddSingleton<IChannelDeliveryService, ChannelDeliveryService>();
        #endregion

        #region Compatibility
        services.AddSingleton<KurisuCompatibilityService>();
        services.AddSingleton<KurisuRuntimeProfileService>();
        services.AddSingleton<IProjectSummaryService, ProjectSummaryService>();
        services.AddSingleton<ISettingsResolver, DesktopSettingsResolver>();
        #endregion

        #region WorkspacePaths (root workspace context)
        services.AddSingleton<WorkspacePaths>(_ => new WorkspacePaths
        {
            WorkspaceRoot = Environment.CurrentDirectory
        });
        #endregion

        #region Extensions
        services.AddSingleton<IExtensionCatalogService, ExtensionCatalogService>();
        #endregion

        #region Followup
        services.AddSingleton<IFollowupSuggestionCache, InMemoryFollowupSuggestionCache>();
        services.AddSingleton<IFollowupSuggestionGenerator, ProviderBackedFollowupSuggestionGenerator>();
        services.AddSingleton<IFollowupSuggestionService, FollowupSuggestionService>();
        #endregion

        #region Hooks
        services.AddSingleton<HookRegistryService>();
        services.AddSingleton<HookCommandRunner>();
        services.AddSingleton<HookOutputAggregator>();
        services.AddSingleton<IHookLifecycleService, HookLifecycleService>();
        services.AddSingleton<IUserPromptHookService, UserPromptHookService>();
        #endregion

        #region IDE
        services.AddSingleton<HttpClient>();
        services.AddSingleton<IIdeDetectionService, IdeDetectionService>();
        services.AddSingleton<IIdeContextService, IdeContextService>();
        services.AddSingleton<IIdeCommandRunner, IdeCommandRunner>();
        services.AddSingleton<IIdeProcessProbe, IdeProcessProbe>();
        services.AddSingleton<IIdeInstallerService, IdeInstallerService>();
        services.AddSingleton<IIdeBackendService, IdeBackendService>();
        services.AddSingleton<IIdeCompanionTransport, IdeCompanionTransport>();
        services.AddSingleton<IIdeClientService, IdeClientService>();
        #endregion

        #region MCP
        services.AddSingleton<HttpClient>();
        services.AddSingleton<IMcpTokenStore, FileMcpTokenStore>();
        services.AddSingleton<IMcpRegistry, McpRegistryService>();
        services.AddSingleton<IMcpConnectionManager, McpConnectionManagerService>();
        services.AddSingleton<IMcpToolRuntime, McpToolRuntimeService>();
        services.AddSingleton<IMcpResourceRegistryService, McpResourceRegistryService>();
        #endregion

        #region Output
        services.AddSingleton<TextOutputFormatter>();
        services.AddSingleton<JsonOutputFormatter>();
        services.AddSingleton<IOutputFormatter, OutputFormatter>();
        services.AddSingleton<ISessionExportService, SessionExportService>();
        #endregion

        #region Permissions
        services.AddSingleton<IApprovalPolicyEngine, ApprovalPolicyService>();
        services.AddSingleton<IApprovalSessionRuleStore, ApprovalSessionRuleStore>();
        #endregion

        #region Prompts
        services.AddSingleton<IPromptRegistryService, PromptRegistryService>();
        #endregion

        #region Runtime
        services.AddSingleton<HttpClient>();
        services.AddSingleton<ProviderConfigurationService>();
        services.AddSingleton<ProviderModelLister>();
        services.AddSingleton<IModelRegistry, ModelRegistryService>();
        services.AddSingleton<IModelConfigResolver, ModelConfigResolver>();
        services.AddSingleton<IBaseLlmClient, OpenAiCompatibleBaseLlmClient>();
        services.AddSingleton<IContentGenerator, ContentGenerator>();
        services.AddSingleton<ILoopDetectionService, LoopDetectionService>();
        services.AddSingleton<ITokenLimitService, TokenLimitService>();
        services.AddSingleton<INonInteractiveToolExecutor, NonInteractiveToolExecutor>();
        services.AddSingleton<IToolCallScheduler, ToolCallScheduler>();
        services.AddSingleton<IAssistantPromptAssembler, AssistantPromptAssembler>();
        services.AddSingleton<ISlashCommandRuntime, SlashCommandRuntime>();
        services.AddSingleton<ICommandActionRuntime, CommandActionRuntime>();
        services.AddSingleton<IAssistantResponseProvider, DashScopeAssistantResponseProvider>();
        services.AddSingleton<IAssistantResponseProvider, OpenAiCompatibleAssistantResponseProvider>();
        services.AddSingleton<IAssistantResponseProvider, FallbackAssistantResponseProvider>();
        services.AddSingleton<IAssistantTurnRuntime, AssistantTurnRuntime>();
        #endregion

        #region Telemetry
        services.AddSingleton<ITelemetryService, TelemetryService>();
        #endregion

        #region Tools
        services.AddSingleton<HttpClient>();
        services.AddSingleton<ICronScheduler, InMemoryCronScheduler>();
        services.AddSingleton<IShellExecutionService, ShellExecutionService>();
        services.AddSingleton<IWebToolService, WebToolService>();
        services.AddSingleton<IUserQuestionToolService, UserQuestionToolService>();
        services.AddSingleton<ILspToolService, RoslynLspToolService>();
        services.AddSingleton<ISkillToolService, SkillToolService>();
        services.AddSingleton<IToolRegistry, ToolCatalogService>();
        services.AddSingleton<IToolExecutor, NativeToolHostService>();
        #endregion

        #region Agents
        services.AddSingleton<IArenaSessionRegistry, ArenaSessionRegistry>();
        services.AddSingleton<ISubagentModelSelectionService, SubagentModelSelectionService>();
        services.AddSingleton<ISubagentValidationService, SubagentValidationService>();
        services.AddSingleton<ISubagentCatalog, SubagentCatalogService>();
        services.AddSingleton<ISubagentCoordinator, SubagentCoordinatorService>();
        services.AddSingleton<IAgentArenaService, AgentArenaService>();
        #endregion

        #region Sessions
        services.AddSingleton<IChatCompressionService>(static provider =>
            new ChatCompressionService(provider.GetService<IContentGenerator>()));
        services.AddSingleton<IChatRecordingService, ChatRecordingService>();
        services.AddSingleton<ITranscriptStore, DesktopSessionCatalogService>();
        services.AddSingleton<ISessionService>(static provider =>
            (DesktopSessionCatalogService)provider.GetRequiredService<ITranscriptStore>());
        services.AddSingleton<IInterruptedTurnStore, InterruptedTurnStore>();
        services.AddSingleton<IActiveTurnRegistry, ActiveTurnRegistry>();
        services.AddSingleton<ISessionTranscriptWriter, SessionTranscriptWriter>();
        services.AddSingleton<ISessionEventFactory, SessionEventFactory>();
        services.AddSingleton<IPendingApprovalResolver, PendingApprovalResolver>();
        services.AddSingleton<PendingToolApprovalMessageHandler>();
        services.AddSingleton<PendingQuestionAnswerMessageHandler>();
        services.AddSingleton<ISessionMessageBus, SessionMessageBus>();
        services.AddSingleton<ISessionHost, DesktopSessionHostService>();
        #endregion

        return services;
    }

    /// <summary>
    /// Adds the Desktop state services, bridges, and App host infrastructure.
    /// </summary>
    public static IServiceCollection AddKurisuDesktop(this IServiceCollection services)
    {
        #region Desktop bridges (IPC-facing adapters over Core)
        services.AddSingleton<ILocaleStateService, LocaleStateService>();
        services.AddSingleton<IBootstrapBridge, BootstrapBridge>();
        services.AddSingleton<IArenaBridge, ArenaBridge>();
        services.AddSingleton<ProviderListService>();
        services.AddSingleton<IChannelBridge, ChannelBridge>();
        services.AddSingleton<IMcpBridge, McpBridge>();
        services.AddSingleton<IPromptBridge, PromptBridge>();
        services.AddSingleton<IMcpResourceBridge, McpResourceBridge>();
        services.AddSingleton<IFollowupBridge, FollowupBridge>();
        services.AddSingleton<IExtensionBridge, ExtensionBridge>();
        services.AddSingleton<IWorkspaceBridge, WorkspaceBridge>();
        services.AddSingleton<ISessionBridge, SessionBridge>();
        services.AddSingleton<ISessionEventPublisher>(sp =>
            (ISessionEventPublisher)sp.GetRequiredService<ISessionBridge>());
        services.AddSingleton<IDirectConnectSessionService, DirectConnectSessionService>();
        services.AddSingleton<IDirectConnectServerHost, DirectConnectHttpServerHost>();
        services.AddSingleton<ISessionTitleGenerationService, SessionTitleGenerationService>();
        services.AddSingleton<IDesktopSurface, DesktopFacade>();
        #endregion

        #region App host (IPC dispatch and Electron wiring)
        services.AddSingleton<DesktopIpcService>();
        services.AddSingleton<IDesktopWindowBridge, DesktopWindowBridge>();
        services.AddSingleton<ElectronDesktopBridgeService>();
        #endregion

        return services;
    }
}
