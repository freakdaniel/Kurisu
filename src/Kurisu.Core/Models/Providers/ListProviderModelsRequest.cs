using Kurisu.Core.Infrastructure.Constants;

namespace Kurisu.Core.Models;

/// <summary>
/// IPC request to list models for a provider preset.
/// </summary>
public sealed class ListProviderModelsRequest
{
    /// <summary>
    /// Preset id (e.g. ProviderIds.OpenAI, ProviderIds.DeepSeek).
    /// </summary>
    public string PresetId { get; init; } = string.Empty;

    /// <summary>
    /// API key to authenticate the request.
    /// </summary>
    public string ApiKey { get; init; } = string.Empty;

    /// <summary>
    /// When true, bypass the on-disk cache.
    /// </summary>
    public bool ForceRefresh { get; init; }
}
