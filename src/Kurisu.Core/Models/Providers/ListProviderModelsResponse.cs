namespace Kurisu.Core.Models;

/// <summary>
/// IPC response for a live provider model list query.
/// </summary>
public sealed class ListProviderModelsResponse
{
    /// <summary>
    /// Gets or sets the model ids returned by the provider.
    /// </summary>
    public required IReadOnlyList<string> Models { get; init; }

    /// <summary>
    /// Gets or sets a non-fatal error message (e.g. provider returned 401,
    /// or the response shape was unparseable). When non-empty, the picker
    /// shows the error alongside the (possibly empty) model list.
    /// </summary>
    public required string Error { get; init; }

    /// <summary>
    /// Gets or sets whether the result was served from the on-disk cache.
    /// </summary>
    public required bool FromCache { get; init; }
}
