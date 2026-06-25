using System.IO;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Kurisu.Core.Agents;
using Kurisu.Core.Channels;
using Kurisu.Core.Compatibility;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Models;
using Kurisu.Core.Runtime;
using Kurisu.Core.Sessions;
using Kurisu.Core.Tools;
using Kurisu.Core.Mcp;
using Kurisu.Core.Extensions;
using Kurisu.Core.Runtime.Providers;
using Kurisu.App.Desktop.Bridges;
using Kurisu.App.Desktop.State;

namespace Kurisu.App.Desktop.Bridges;

/// <summary>
/// Represents the Bootstrap Projection Service
/// </summary>
/// <param name="options">The options</param>
/// <param name="workspacePathResolver">The workspace path resolver</param>
/// <param name="settingsResolver">The settings resolver</param>
/// <param name="projectSummaryService">The project summary service</param>
/// <param name="toolRegistry">The tool registry</param>
/// <param name="toolExecutor">The tool executor</param>
/// <param name="channelRegistryService">The channel registry service</param>
/// <param name="extensionCatalogService">The extension catalog service</param>
/// <param name="workspaceInspectionService">The workspace inspection service</param>
/// <param name="providerListService">The multi-provider list service</param>
/// <param name="mcpConnectionManager">The mcp connection manager</param>
/// <param name="modelRegistry">The model registry</param>
/// <param name="transcriptStore">The transcript store</param>
/// <param name="activeTurnRegistry">The active turn registry</param>
/// <param name="arenaSessionRegistry">The arena session registry</param>
/// <param name="interruptedTurnStore">The interrupted turn store</param>
/// <param name="chatRecordingService">The chat recording service</param>
/// <param name="sessionTitleGenerationService">The session title generation service</param>
/// <param name="localeStateService">The locale state service</param>
public sealed class BootstrapBridge(
    IOptions<DesktopShellOptions> options,
    IWorkspacePathResolver workspacePathResolver,
    ISettingsResolver settingsResolver,
    IProjectSummaryService projectSummaryService,
    IToolRegistry toolRegistry,
    IToolExecutor toolExecutor,
    IChannelRegistryService channelRegistryService,
    IExtensionCatalogService extensionCatalogService,
    IWorkspaceInspectionService workspaceInspectionService,
    ProviderListService providerListService,
    IMcpConnectionManager mcpConnectionManager,
    IModelRegistry modelRegistry,
    ITranscriptStore transcriptStore,
    IActiveTurnRegistry activeTurnRegistry,
    IArenaSessionRegistry arenaSessionRegistry,
    IInterruptedTurnStore interruptedTurnStore,
    IChatRecordingService chatRecordingService,
    ISessionTitleGenerationService sessionTitleGenerationService,
    ILocaleStateService localeStateService) : IBootstrapBridge
{
    private readonly DesktopShellOptions _options = options.Value;
    private readonly IChatRecordingService _chatRecordingService = chatRecordingService;
    private readonly ISessionTitleGenerationService _sessionTitleGenerationService = sessionTitleGenerationService;
    private readonly ILocaleStateService _localeStateService = localeStateService;

    /// <summary>
    /// Creates bootstrap
    /// </summary>
    /// <param name="currentLocale">The current locale</param>
    /// <returns>The resulting app bootstrap payload</returns>
    public AppBootstrapPayload CreateBootstrap(string currentLocale)
    {
        var workspace = workspacePathResolver.Resolve(_options.Workspace);
        var runtime = settingsResolver.InspectRuntimeProfile(workspace);
        var projectSummary = projectSummaryService.Read(runtime) ?? CreateEmptyProjectSummary(workspace.WorkspaceRoot);

        return new AppBootstrapPayload
        {
            ProductName = _options.ProductName,
            CurrentMode = DesktopMode.Code,
            CurrentLocale = currentLocale,
            Locales = DesktopSurfaceCatalog.SupportedLocales,
            WorkspaceRoot = workspace.WorkspaceRoot,
            Tracks = DesktopSurfaceCatalog.Tracks,
            CompatibilityGoals = DesktopSurfaceCatalog.CompatibilityGoals,
            CapabilityLanes = DesktopSurfaceCatalog.CapabilityLanes,
            AdoptionPatterns = DesktopSurfaceCatalog.AdoptionPatterns,
            RecentSessions = ListAllSessions(runtime, 48),
            ActiveTurns = activeTurnRegistry.ListActiveTurns(),
            ActiveArenaSessions = arenaSessionRegistry.ListActiveSessions(),
            RecoverableTurns = interruptedTurnStore.ListRecoverableTurns(runtime.ChatsDirectory),
            ProjectSummary = projectSummary,
            KurisuCompatibility = settingsResolver.InspectCompatibility(workspace),
            KurisuRuntime = runtime,
            KurisuModels = modelRegistry.Inspect(workspace),
            KurisuTools = toolRegistry.Inspect(workspace),
            KurisuNativeHost = toolExecutor.Inspect(workspace),
            KurisuChannels = channelRegistryService.Inspect(workspace),
            KurisuExtensions = extensionCatalogService.Inspect(workspace),
            KurisuWorkspace = workspaceInspectionService.Inspect(workspace),
            KurisuProviders = providerListService.CreateSnapshot(),
            KurisuMcp = CreateMcpSnapshot(mcpConnectionManager.ListServersWithStatus(workspace)),
            KurisuProviderPresets = ProviderCatalog.Builtins
                .Select(manifest => new ProviderPresetSnapshot(
                    Id: manifest.Id,
                    Name: manifest.Name,
                    Description: manifest.Description,
                    Family: manifest.Family,
                    DefaultBaseUrl: manifest.DefaultBaseUrl,
                    DefaultModelId: manifest.DefaultModelId,
                    Capabilities: manifest.Capabilities,
                    Popularity: manifest.Popularity,
                    DocsUrl: manifest.DocsUrl,
                    ModelsSourceUrl: manifest.ModelsSourceUrl))
                .ToArray()
        };
    }

    private IReadOnlyList<SessionPreview> ListAllSessions(KurisuRuntimeProfile runtime, int limit)
    {
        var globalKurisuDirectory = runtime.GlobalKurisuDirectory;
        var projectsDirectory = Path.Combine(globalKurisuDirectory, "projects");

        if (!Directory.Exists(projectsDirectory))
        {
            return transcriptStore.ListSessions(workspacePathResolver.Resolve(_options.Workspace), limit);
        }

        var allSessions = new List<SessionPreview>();

        foreach (var projectDir in Directory.EnumerateDirectories(projectsDirectory))
        {
            var chatsDir = Path.Combine(projectDir, "chats");
            if (!Directory.Exists(chatsDir)) continue;

            var sessions = Directory.EnumerateFiles(chatsDir, "*.jsonl")
                .Select(path => new FileInfo(path))
                .Where(file => file.Exists)
                .OrderByDescending(file => file.LastWriteTimeUtc)
                .Select(file => TryReadSessionPreview(file, globalKurisuDirectory, _chatRecordingService, _sessionTitleGenerationService, _localeStateService))
                .OfType<SessionPreview>();

            allSessions.AddRange(sessions);
        }

        return allSessions
            .OrderByDescending(s => DateTime.Parse(s.LastActivity))
            .Take(limit)
            .ToArray();
    }

    private static SessionPreview? TryReadSessionPreview(
        FileInfo file,
        string globalKurisuDirectory,
        IChatRecordingService chatRecordingService,
        ISessionTitleGenerationService sessionTitleGenerationService,
        ILocaleStateService localeStateService)
    {
        try
        {
            using var stream = file.OpenRead();
            using var reader = new StreamReader(stream);

            string? sessionId = null;
            string? workingDirectory = null;
            string? gitBranch = null;
            string? firstUserPrompt = null;
            var messageIds = new HashSet<string>(StringComparer.Ordinal);

            string? line;
            var scannedLines = 0;

            while ((line = reader.ReadLine()) is not null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;

                scannedLines++;
                using var document = JsonDocument.Parse(line);
                var root = document.RootElement;

                sessionId ??= GetProp(root, "sessionId");
                workingDirectory ??= GetProp(root, "cwd");
                gitBranch ??= GetProp(root, "gitBranch");

                if (GetProp(root, "type") is "user" or "assistant")
                {
                    if (GetProp(root, "uuid") is { Length: > 0 } uuid)
                    {
                        messageIds.Add(uuid);
                    }
                    else
                    {
                        messageIds.Add($"{file.FullName}:{scannedLines}");
                    }
                }

                if (firstUserPrompt is null &&
                    GetProp(root, "type") == "user" &&
                    ExtractPrompt(root) is { Length: > 0 } prompt)
                {
                    firstUserPrompt = prompt;
                }

                if (scannedLines >= 2000 || (scannedLines >= 200 && firstUserPrompt is not null && messageIds.Count > 0)) break;
            }

            var effectiveSessionId = string.IsNullOrWhiteSpace(sessionId)
                ? Path.GetFileNameWithoutExtension(file.Name)
                : sessionId!;

            var cachedMeta = chatRecordingService.TryReadMetadata(file.FullName);
            string? title = !string.IsNullOrWhiteSpace(cachedMeta?.Title) ? cachedMeta.Title : null;
            var messageCount = Math.Max(cachedMeta?.MessageCount ?? 0, messageIds.Count);
            if (messageCount <= 0)
            {
                return null;
            }

            if (title is null && !string.IsNullOrWhiteSpace(firstUserPrompt))
            {
                sessionTitleGenerationService.EnqueueTitleGeneration(
                    sessionId:        effectiveSessionId,
                    firstMessageText: firstUserPrompt,
                    transcriptPath:   file.FullName,
                    workingDirectory: workingDirectory ?? globalKurisuDirectory,
                    locale:           localeStateService.CurrentLocale);
            }

            return new SessionPreview
            {
                SessionId = effectiveSessionId,
                Title = title,
                LastActivity = file.LastWriteTimeUtc.ToString("O"),
                StartedAt = file.CreationTimeUtc.ToString("O"),
                LastUpdatedAt = file.LastWriteTimeUtc.ToString("O"),
                Category = string.IsNullOrWhiteSpace(gitBranch) ? "default" : gitBranch!,
                Mode = DesktopMode.Code,
                Status = "resume-ready",
                WorkingDirectory = workingDirectory ?? globalKurisuDirectory,
                GitBranch = gitBranch ?? string.Empty,
                MessageCount = messageCount,
                TranscriptPath = file.FullName,
                MetadataPath = string.Empty,
            };
        }
        catch
        {
            return null;
        }
    }

    private static string? GetProp(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String)
            return prop.GetString();
        return null;
    }

    private static string? ExtractPrompt(JsonElement root)
    {
        if (!root.TryGetProperty("message", out var msg))
        {
            return null;
        }

        if (msg.TryGetProperty("content", out var content) &&
            content.ValueKind == JsonValueKind.String)
        {
            var contentText = content.GetString();
            if (!string.IsNullOrWhiteSpace(contentText))
            {
                return contentText.Length > 140 ? $"{contentText[..140]}..." : contentText;
            }
        }

        if (!msg.TryGetProperty("parts", out var parts) ||
            parts.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String)
            {
                var t = text.GetString();
                if (!string.IsNullOrWhiteSpace(t))
                    return t.Length > 140 ? $"{t[..140]}..." : t;
            }
        }
        return null;
    }

    private static McpSnapshot CreateMcpSnapshot(IReadOnlyList<McpServerDefinition> servers) =>
        new()
        {
            TotalCount = servers.Count,
            ConnectedCount = servers.Count(static item => string.Equals(item.Status, "connected", StringComparison.OrdinalIgnoreCase)),
            DisconnectedCount = servers.Count(static item => string.Equals(item.Status, "disconnected", StringComparison.OrdinalIgnoreCase)),
            MissingCount = servers.Count(static item => string.Equals(item.Status, "missing", StringComparison.OrdinalIgnoreCase)),
            TokenCount = servers.Count(static item => item.HasPersistedToken),
            Servers = servers
        };

    private static ProjectSummarySnapshot CreateEmptyProjectSummary(string workspaceRoot) =>
        new()
        {
            HasHistory = false,
            FilePath = Path.Combine(Path.GetFullPath(workspaceRoot), ".kurisu", "PROJECT_SUMMARY.md"),
            Content = string.Empty,
            TimestampText = string.Empty,
            TimeAgo = string.Empty,
            OverallGoal = string.Empty,
            CurrentPlan = string.Empty,
            TotalTasks = 0,
            DoneCount = 0,
            InProgressCount = 0,
            TodoCount = 0,
            PendingTasks = [],
            TimestampUtc = DateTime.MinValue
        };
}
