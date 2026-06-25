namespace Kurisu.Core.Models;

/// <summary>
/// Configure a single provider: store its API key + optional base URL override.
/// Replaces the legacy single-auth <c>ConfigureOpenAiCompatibleAuthRequest</c>.
/// </summary>
public sealed class ConfigureProviderRequest
{
    /// <summary>Provider id (e.g. "openai", "anthropic", "deepseek").</summary>
    public required string ProviderId { get; init; }

    /// <summary>API key to store.</summary>
    public required string ApiKey { get; init; }

    /// <summary>Optional base URL override (uses manifest default if null).</summary>
    public string? BaseUrl { get; init; }
}

/// <summary>
/// Forget the API key + base URL override for the given provider.
/// Replaces the legacy single-auth <c>DisconnectAuthRequest</c>.
/// </summary>
public sealed class DeconfigureProviderRequest
{
    /// <summary>Provider id to remove (e.g. "openai", "anthropic").</summary>
    public required string ProviderId { get; init; }
}