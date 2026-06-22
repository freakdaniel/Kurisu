namespace Kurisu.Core.Models;

/// <summary>
/// Represents the Configure Open Ai Compatible Auth Request
/// </summary>
public sealed class ConfigureOpenAiCompatibleAuthRequest
{
    /// <summary>
    /// Gets or sets the scope
    /// </summary>
    public required string Scope { get; init; }

    /// <summary>
    /// Gets or sets the auth type
    /// </summary>
    public string AuthType { get; init; } = "openai";

    /// <summary>
    /// Gets or sets the model
    /// </summary>
    public string Model { get; init; } = string.Empty;

    /// <summary>
    /// Gets or sets the base url
    /// </summary>
    public string BaseUrl { get; init; } = string.Empty;

    /// <summary>
    /// Gets or sets the api key
    /// </summary>
    public string ApiKey { get; init; } = string.Empty;

    /// <summary>
    /// Gets or sets the api key environment variable
    /// </summary>
    public string ApiKeyEnvironmentVariable { get; init; } = "OPENAI_API_KEY";

    /// <summary>
    /// Gets or sets the optional provider preset id. When set, the auth flow
    /// pre-fills <see cref="BaseUrl"/>, <see cref="ApiKeyEnvironmentVariable"/>,
    /// and (if empty) <see cref="Model"/> from the preset. User-supplied values
    /// still take precedence.
    /// </summary>
    public string PresetId { get; init; } = string.Empty;
}
