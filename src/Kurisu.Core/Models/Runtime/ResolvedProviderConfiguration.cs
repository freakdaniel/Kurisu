using System.Text.Json.Nodes;

namespace Kurisu.Core.Runtime;

/// <summary>
/// Snapshot of a fully resolved provider configuration produced by
/// <see cref="Kurisu.Core.Runtime.Providers.ProviderConfigurationService"/>.
/// Multi-provider: each <c>ProviderId</c> in
/// <see cref="Kurisu.Core.Runtime.Providers.ProviderCatalog"/> has its own
/// apiKey/baseUrl entry in
/// <see cref="Kurisu.Core.Runtime.Providers.ProviderSettingsStore"/>; the
/// service picks the right one per request.
/// </summary>
public sealed class ResolvedProviderConfiguration
{
    /// <summary>Provider id (e.g. "anthropic", "openai", "deepseek").</summary>
    public required string ProviderId { get; init; }

    /// <summary>Provider flavor tag (e.g. "openai-compatible", "openrouter", "modelscope", "deepseek", "dashscope").</summary>
    public required string ProviderFlavor { get; init; }

    /// <summary>Model id that will be sent in the API request.</summary>
    public required string Model { get; init; }

    /// <summary>Full chat-completions endpoint URL (baseUrl + /chat/completions).</summary>
    public required string Endpoint { get; init; }

    /// <summary>Effective API key (empty if not configured).</summary>
    public required string ApiKey { get; init; }

    /// <summary>Env var name from which <see cref="ApiKey"/> was resolved (for diagnostics).</summary>
    public required string ApiKeyEnvironmentVariable { get; init; }

    /// <summary>HTTP headers to attach to each request (OpenRouter referer, custom headers, ...).</summary>
    public required IReadOnlyDictionary<string, string> Headers { get; init; }

    /// <summary>JSON body fields merged into each request (e.g. <c>enable_thinking</c>).</summary>
    public required JsonObject ExtraBody { get; init; }

    /// <summary>True for DashScope/Qwen endpoints that use specific request body fields.</summary>
    public required bool IsDashScope { get; init; }
}
