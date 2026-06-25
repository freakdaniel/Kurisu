using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Kurisu.Core.Auth;
using Kurisu.Core.Channels;
using Kurisu.App.Desktop.Bridges;
using Kurisu.Core.Extensions;
using Kurisu.Core.Followup;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Prompts;
using Kurisu.Core.Config;
using Kurisu.Core.Runtime.Providers;
using Kurisu.Tests.Shared.Fakes;
using Kurisu.App.Desktop.State;

namespace Kurisu.Tests.Shared.Fixtures;

internal static class TestServiceFactory
{
    internal static DesktopFacade CreateService(DesktopShellOptions? options = null)
    {
        var environmentPaths = new FakeDesktopEnvironmentPaths(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            Environment.CurrentDirectory,
            AppContext.BaseDirectory);
        var runtimeProfileService = new KurisuRuntimeProfileService(environmentPaths);
        var approvalPolicyService = new ApprovalPolicyService();
        var approvalSessionRuleStore = new ApprovalSessionRuleStore();
        var workspacePathResolver = new WorkspacePathResolver(environmentPaths);
        var shellOptions = Options.Create(options ?? new DesktopShellOptions());
        var authHttpClient = new HttpClient(new RecordingHttpMessageHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound))));
        var providerSettings = new ProviderSettingsStore(environmentPaths, NullLogger<ProviderSettingsStore>.Instance);
        var selectionStore = new RuntimeSelectionStore(environmentPaths, NullLogger<RuntimeSelectionStore>.Instance);
        var providerListService = new ProviderListService(providerSettings, selectionStore, environmentPaths);
        var compatibilityService = new KurisuCompatibilityService(environmentPaths);
        var settingsResolver = new DesktopSettingsResolver(
            compatibilityService,
            runtimeProfileService);
        var projectSummaryService = new ProjectSummaryService();
        var toolRegistry = new ToolCatalogService(runtimeProfileService, approvalPolicyService);
        var toolExecutor = new NativeToolHostService(
            runtimeProfileService,
            approvalPolicyService,
            approvalSessionRuleStore: approvalSessionRuleStore);
        var gitHistoryService = new GitHistoryService(new GitCliService(), runtimeProfileService);
        var workspaceInspectionService = new WorkspaceInspectionService(
            new GitWorktreeService(new GitCliService(), runtimeProfileService, gitHistoryService),
            new FileDiscoveryService(new GitCliService(), runtimeProfileService));
        var extensionCatalog = new ExtensionCatalogService(runtimeProfileService, environmentPaths);
        var channelRegistry = new ChannelRegistryService(
            environmentPaths,
            settingsResolver,
            extensionCatalog);
        var mcpRegistry = new McpRegistryService(
            runtimeProfileService,
            new FileMcpTokenStore(environmentPaths));
        var mcpConnectionManager = new McpConnectionManagerService(
            mcpRegistry,
            new McpToolRuntimeService(
                mcpRegistry,
                new FileMcpTokenStore(environmentPaths),
                new HttpClient(),
                runtimeProfileService));
        var chatRecordingService = new ChatRecordingService();
        var transcriptStore = new DesktopSessionCatalogService(runtimeProfileService, chatRecordingService);
        var sessionService = (ISessionService)transcriptStore;
        var promptRegistryService = new PromptRegistryService(
            mcpConnectionManager,
            new McpToolRuntimeService(
                mcpRegistry,
                new FileMcpTokenStore(environmentPaths),
                new HttpClient(),
                runtimeProfileService));
        var mcpResourceRegistryService = new McpResourceRegistryService(
            mcpConnectionManager,
            new McpToolRuntimeService(
                mcpRegistry,
                new FileMcpTokenStore(environmentPaths),
                new HttpClient(),
                runtimeProfileService));
        var interruptedTurnStore = new InterruptedTurnStore();
        var activeTurnRegistry = new ActiveTurnRegistry(interruptedTurnStore);
        var arenaSessionRegistry = new ArenaSessionRegistry();
        var sessionHost = CreateSessionHost(
            runtimeProfileService,
            compatibilityService,
            transcriptStore,
            activeTurnRegistry,
            interruptedTurnStore);
        var followupSuggestionService = new FollowupSuggestionService(
            transcriptStore,
            activeTurnRegistry,
            interruptedTurnStore,
            arenaSessionRegistry,
            runtimeProfileService,
            new ProviderBackedFollowupSuggestionGenerator(
                runtimeProfileService,
                new AssistantPromptAssembler(projectSummaryService),
                new StaticContentGenerator(static _ => null),
                Options.Create(new NativeAssistantRuntimeOptions
                {
                    Provider = "fallback"
                })));

        return new DesktopFacade(
            new LocaleStateService(shellOptions),
            new BootstrapBridge(
                shellOptions,
                workspacePathResolver,
                settingsResolver,
                projectSummaryService,
                toolRegistry,
                toolExecutor,
                channelRegistry,
                extensionCatalog,
                workspaceInspectionService,
                providerListService,
                mcpConnectionManager,
                new ModelRegistryService(
                    new RuntimeConfigService(environmentPaths),
                    new RuntimeSelectionStore(environmentPaths, NullLogger<RuntimeSelectionStore>.Instance),
                    new TokenLimitService(),
                    Options.Create(new NativeAssistantRuntimeOptions())),
                transcriptStore,
                activeTurnRegistry,
                arenaSessionRegistry,
                interruptedTurnStore,
                chatRecordingService,
                new FakeSessionTitleGenerationService(),
                new LocaleStateService(shellOptions)),
            new ArenaBridge(arenaSessionRegistry),
            providerListService,
            new ChannelBridge(
                shellOptions,
                workspacePathResolver,
                channelRegistry),
            new WorkspaceBridge(
                shellOptions,
                workspacePathResolver,
                workspaceInspectionService,
                new GitWorktreeService(new GitCliService(), runtimeProfileService, gitHistoryService),
                gitHistoryService),
            new McpBridge(
                shellOptions,
                workspacePathResolver,
                mcpRegistry,
                mcpConnectionManager),
            new PromptBridge(
                shellOptions,
                workspacePathResolver,
                promptRegistryService),
            new McpResourceBridge(
                shellOptions,
                workspacePathResolver,
                mcpResourceRegistryService),
            new FollowupBridge(
                shellOptions,
                workspacePathResolver,
                followupSuggestionService),
            new ExtensionBridge(
                shellOptions,
                workspacePathResolver,
                extensionCatalog),
            new SessionBridge(
                shellOptions,
                workspacePathResolver,
                transcriptStore,
                sessionService,
                toolExecutor,
                sessionHost,
                activeTurnRegistry,
                runtimeProfileService,
                new ServiceCollection()
                    .AddSingleton<ISessionTitleGenerationService>(new FakeSessionTitleGenerationService())
                    .BuildServiceProvider(),
                new LocaleStateService(shellOptions)),
            new ProviderModelLister(environmentPaths));
    }

    internal static DesktopSessionHostService CreateSessionHost(
        KurisuRuntimeProfileService runtimeProfileService,
        KurisuCompatibilityService compatibilityService,
        ITranscriptStore? transcriptStore = null,
        IActiveTurnRegistry? activeTurnRegistry = null,
        IInterruptedTurnStore? interruptedTurnStore = null,
        IUserPromptHookService? userPromptHookService = null,
        IHookLifecycleService? hookLifecycleService = null)
    {
        var approvalPolicyService = new ApprovalPolicyService();
        var approvalSessionRuleStore = new ApprovalSessionRuleStore();
        var effectiveInterruptedTurnStore = interruptedTurnStore ?? new InterruptedTurnStore();
        var chatRecordingService = new ChatRecordingService();
        var effectiveUserQuestionToolService = new UserQuestionToolService();
        var effectiveTranscriptStore = transcriptStore ?? new DesktopSessionCatalogService(runtimeProfileService, chatRecordingService);
        var pendingApprovalResolver = new PendingApprovalResolver();
        var sessionMessageBus = new SessionMessageBus(
            new PendingToolApprovalMessageHandler(
                effectiveTranscriptStore,
                pendingApprovalResolver,
                runtimeProfileService),
            new PendingQuestionAnswerMessageHandler(
                effectiveTranscriptStore,
                pendingApprovalResolver,
                runtimeProfileService,
                effectiveUserQuestionToolService));
        return new DesktopSessionHostService(
            runtimeProfileService,
            new CommandActionRuntime(
                new SlashCommandRuntime(compatibilityService),
                runtimeProfileService,
                compatibilityService,
                new ToolCatalogService(runtimeProfileService, approvalPolicyService)),
            CreateAssistantTurnRuntime(),
            new ChatCompressionService(),
            chatRecordingService,
            new NativeToolHostService(
                runtimeProfileService,
                approvalPolicyService,
                approvalSessionRuleStore: approvalSessionRuleStore),
            hookLifecycleService ?? new PassthroughHookLifecycleService(),
            effectiveUserQuestionToolService,
            userPromptHookService ?? new PassthroughUserPromptHookService(),
            effectiveTranscriptStore,
            activeTurnRegistry ?? new ActiveTurnRegistry(effectiveInterruptedTurnStore),
            effectiveInterruptedTurnStore,
            new SessionTranscriptWriter(),
            new SessionEventFactory(),
            sessionMessageBus,
            approvalSessionRuleStore: approvalSessionRuleStore);
    }

    internal static IAssistantTurnRuntime CreateAssistantTurnRuntime(
        IAssistantResponseProvider? primaryProvider = null,
        IToolExecutor? toolExecutor = null)
    {
        var environmentPaths = new FakeDesktopEnvironmentPaths(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData));
        var configService = new RuntimeConfigService(environmentPaths);
        var providerSettings = new ProviderSettingsStore(environmentPaths, NullLogger<ProviderSettingsStore>.Instance);
        var selectionStore = new RuntimeSelectionStore(environmentPaths, NullLogger<RuntimeSelectionStore>.Instance);
        var modelConfigResolver = new ModelConfigResolver(
            new ModelRegistryService(
                configService,
                selectionStore,
                new TokenLimitService(),
                Options.Create(new NativeAssistantRuntimeOptions())));

        var providers = primaryProvider is null
            ? new IAssistantResponseProvider[]
            {
                new OpenAiCompatibleAssistantResponseProvider(
                    new HttpClient(),
                    new ProviderConfigurationService(
                        providerSettings ?? new ProviderSettingsStore(environmentPaths, NullLogger<ProviderSettingsStore>.Instance),
                        selectionStore ?? new RuntimeSelectionStore(environmentPaths, NullLogger<RuntimeSelectionStore>.Instance),
                        environmentPaths,
                        Options.Create(new NativeAssistantRuntimeOptions())),
                    new TokenLimitService()),
                new FallbackAssistantResponseProvider()
            }
            : [primaryProvider, new FallbackAssistantResponseProvider()];

        return new AssistantTurnRuntime(
            new AssistantPromptAssembler(
                new ProjectSummaryService(),
                new DesktopSessionCatalogService(
                    new KurisuRuntimeProfileService(environmentPaths),
                    new ChatRecordingService())),
            providers,
            new ToolCallScheduler(
                new NonInteractiveToolExecutor(toolExecutor ?? new FakeToolExecutor()),
                new LoopDetectionService()),
            new LoopDetectionService(),
            new TokenLimitService(),
            new ProviderConfigurationService(
                providerSettings ?? new ProviderSettingsStore(environmentPaths, NullLogger<ProviderSettingsStore>.Instance),
                selectionStore ?? new RuntimeSelectionStore(environmentPaths, NullLogger<RuntimeSelectionStore>.Instance),
                environmentPaths,
                Options.Create(new NativeAssistantRuntimeOptions())),
            Options.Create(new NativeAssistantRuntimeOptions
            {
                Provider = primaryProvider?.Name ?? "fallback"
            }));
    }

    private sealed class PassthroughUserPromptHookService : IUserPromptHookService
    {
        public Task<UserPromptHookResult> ExecuteAsync(
            KurisuRuntimeProfile runtimeProfile,
            UserPromptHookRequest request,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new UserPromptHookResult
            {
                EffectivePrompt = request.Prompt
            });
    }

    private sealed class PassthroughHookLifecycleService : IHookLifecycleService
    {
        public Task<HookLifecycleResult> ExecuteAsync(
            KurisuRuntimeProfile runtimeProfile,
            HookInvocationRequest request,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new HookLifecycleResult());
    }
}
