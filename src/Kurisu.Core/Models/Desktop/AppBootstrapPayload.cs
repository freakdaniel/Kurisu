using Kurisu.Core.Models;
using Kurisu.Core.Runtime;

namespace Kurisu.Core.Models;

/// <summary>
/// Represents the App Bootstrap Payload
/// </summary>
public sealed class AppBootstrapPayload
{
    /// <summary>
    /// Gets or sets the product name
    /// </summary>
    public required string ProductName { get; init; }

    /// <summary>
    /// Gets or sets the current mode
    /// </summary>
    public required DesktopMode CurrentMode { get; init; }

    /// <summary>
    /// Gets or sets the current locale
    /// </summary>
    public required string CurrentLocale { get; init; }

    /// <summary>
    /// Gets or sets the locales
    /// </summary>
    public required IReadOnlyList<LocaleOption> Locales { get; init; }

    /// <summary>
    /// Gets or sets the workspace root
    /// </summary>
    public required string WorkspaceRoot { get; init; }

    /// <summary>
    /// Gets or sets the tracks
    /// </summary>
    public required IReadOnlyList<ResearchTrack> Tracks { get; init; }

    /// <summary>
    /// Gets or sets the compatibility goals
    /// </summary>
    public required IReadOnlyList<string> CompatibilityGoals { get; init; }

    /// <summary>
    /// Gets or sets the capability lanes
    /// </summary>
    public required IReadOnlyList<CapabilityLane> CapabilityLanes { get; init; }

    /// <summary>
    /// Gets or sets the adoption patterns
    /// </summary>
    public required IReadOnlyList<AdoptionPattern> AdoptionPatterns { get; init; }

    /// <summary>
    /// Gets or sets the recent sessions
    /// </summary>
    public required IReadOnlyList<SessionPreview> RecentSessions { get; init; }

    /// <summary>
    /// Gets or sets the active turns
    /// </summary>
    public required IReadOnlyList<ActiveTurnState> ActiveTurns { get; init; }

    /// <summary>
    /// Gets or sets the active arena sessions
    /// </summary>
    public required IReadOnlyList<ActiveArenaSessionState> ActiveArenaSessions { get; init; }

    /// <summary>
    /// Gets or sets the recoverable turns
    /// </summary>
    public required IReadOnlyList<RecoverableTurnState> RecoverableTurns { get; init; }

    /// <summary>
    /// Gets or sets the project summary
    /// </summary>
    public required ProjectSummarySnapshot ProjectSummary { get; init; }

    /// <summary>
    /// Gets or sets the kurisu compatibility
    /// </summary>
    public required KurisuCompatibilitySnapshot KurisuCompatibility { get; init; }

    /// <summary>
    /// Gets or sets the kurisu runtime
    /// </summary>
    public required KurisuRuntimeProfile KurisuRuntime { get; init; }

    /// <summary>
    /// Gets or sets the kurisu models
    /// </summary>
    public required RuntimeModelSnapshot KurisuModels { get; init; }

    /// <summary>
    /// Gets or sets the kurisu tools
    /// </summary>
    public required ToolCatalogSnapshot KurisuTools { get; init; }

    /// <summary>
    /// Gets or sets the kurisu native host
    /// </summary>
    public required NativeToolHostSnapshot KurisuNativeHost { get; init; }

    /// <summary>
    /// Gets or sets the kurisu auth
    /// </summary>
    public required AuthStatusSnapshot KurisuAuth { get; init; }

    /// <summary>
    /// Gets or sets the kurisu mcp
    /// </summary>
    public required McpSnapshot KurisuMcp { get; init; }

    /// <summary>
    /// Gets or sets the kurisu extensions
    /// </summary>
    public required ExtensionSnapshot KurisuExtensions { get; init; }

    /// <summary>
    /// Gets or sets the kurisu channels
    /// </summary>
    public required ChannelSnapshot KurisuChannels { get; init; }

    /// <summary>
    /// Gets or sets the kurisu workspace
    /// </summary>
    public required WorkspaceSnapshot KurisuWorkspace { get; init; }

    /// <summary>
    /// Gets or sets the provider preset catalog shown in the auth screen.
    /// </summary>
    public required IReadOnlyList<ProviderPresetSnapshot> KurisuProviderPresets { get; init; }
}
