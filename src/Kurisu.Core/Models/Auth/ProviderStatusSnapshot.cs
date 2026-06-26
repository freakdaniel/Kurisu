using Kurisu.Core.Infrastructure.Constants;

namespace Kurisu.Core.Models;

/// <summary>
/// Per-provider runtime status returned by
/// <see cref="Kurisu.Core.Runtime.Providers.ProviderSettingsStore"/> for the
/// multi-provider UI. Replaces the legacy single-auth
/// <c>AuthStatusSnapshot</c> shape: instead of one
/// <c>SelectedType</c> + one <c>ApiKey</c>, returns a list of all configured
/// providers with their reachability + key state.
/// </summary>
public sealed class ProviderStatusSnapshot
{
    /// <summary>Provider id (e.g. ProviderIds.OpenAI, ProviderIds.Anthropic, ProviderIds.DeepSeek).</summary>
    public required string ProviderId { get; init; }

    /// <summary>Display name for the UI.</summary>
    public required string DisplayName { get; init; }

    /// <summary>Effective base URL (override or manifest default).</summary>
    public required string BaseUrl { get; init; }

    /// <summary>Env var name from which the API key was resolved.</summary>
    public required string ApiKeyEnvironmentVariable { get; init; }

    /// <summary>Whether a key is available (store + env + inline override).</summary>
    public required bool HasApiKey { get; init; }

    /// <summary>One of ProviderStatusKind.Configured, ProviderStatusKind.MissingCredentials.</summary>
    public required string Status { get; init; }

    /// <summary>Error message for the UI when <see cref="Status"/> indicates a problem.</summary>
    public string LastError { get; init; } = string.Empty;
}

/// <summary>
/// Snapshot of all configured providers for the IPC layer. Replaces the
/// legacy single-auth <c>AuthStatusSnapshot</c>.
/// </summary>
public sealed class ProviderListSnapshot
{
    /// <summary>The currently active provider id (from <see cref="Kurisu.Core.Config.RuntimeSelectionStore"/>).</summary>
    public required string ActiveProviderId { get; init; }

    /// <summary>All configured providers (or all built-in manifests if none configured).</summary>
    public required IReadOnlyList<ProviderStatusSnapshot> Providers { get; init; }
}