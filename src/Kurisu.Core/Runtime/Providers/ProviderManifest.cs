namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Immutable descriptor of a built-in provider. Inspired by Cline's
/// <c>BuiltInProviderManifest</c>: carries everything the app needs to talk
/// to a provider without an additional round-trip to a settings file.
/// </summary>
/// <param name="Id">Stable identifier (e.g. <c>openai</c>, <c>anthropic</c>).</param>
/// <param name="Name">Display name shown in the UI.</param>
/// <param name="Description">Long-form description shown next to the provider name.</param>
/// <param name="Family">Adapter family (e.g. <c>openai-compatible</c>).</param>
/// <param name="DefaultBaseUrl">Default base URL for the API.</param>
/// <param name="DefaultModelId">Default model identifier; <c>null</c> means "user picks".</param>
/// <param name="ApiKeyEnvVars">Environment variable names to probe for the API key.</param>
/// <param name="Capabilities">Capability tags such as <c>tools</c>, <c>reasoning</c>.</param>
/// <param name="ModelsSourceUrl">Optional endpoint that returns the live model list (typically <c>/v1/models</c>).</param>
/// <param name="KnownModels">Optional hard-coded model metadata used as a fallback when the live list is unavailable.</param>
/// <param name="ModelsSourceHeaders">Optional extra HTTP headers required by the model-list endpoint (e.g. for routers that demand an account id).</param>
/// <param name="DocsUrl">Link to provider docs (shown in the UI).</param>
/// <param name="Popularity">Sort key for UI lists (higher = earlier).</param>
public sealed record ProviderManifest(
    string Id,
    string Name,
    string Description,
    string Family,
    string? DefaultBaseUrl,
    string? DefaultModelId,
    IReadOnlyList<string> ApiKeyEnvVars,
    IReadOnlyList<string> Capabilities,
    string? ModelsSourceUrl,
    IReadOnlyDictionary<string, ModelInfo>? KnownModels,
    IReadOnlyDictionary<string, string>? ModelsSourceHeaders,
    string? DocsUrl,
    int Popularity)
{
    /// <summary>True when this manifest can be reached via the OpenAI-compatible transport.</summary>
    public bool IsOpenAiCompatible =>
        Family.StartsWith("openai", StringComparison.OrdinalIgnoreCase);
}