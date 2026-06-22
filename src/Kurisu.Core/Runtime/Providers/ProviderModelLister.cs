using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Models;

namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Fetches the live model list from a provider's <c>/v1/models</c> endpoint (or
/// Ollama's <c>/api/tags</c>). Results are cached on disk for 1 hour.
/// </summary>
/// <summary>
/// Fetches the live model list from a provider's <c>/v1/models</c> endpoint (or
/// Ollama's <c>/api/tags</c>). Results are cached on disk for 1 hour.
/// </summary>
public sealed class ProviderModelLister
{
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromHours(1);

    private readonly IDesktopEnvironmentPaths environmentPaths;
    private readonly HttpClient httpClient;
    private readonly TimeProvider timeProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProviderModelLister"/> class.
    /// </summary>
    /// <param name="environmentPaths">Environment paths for cache location.</param>
    /// <param name="httpClient">Optional HTTP client; a new one is created if null.</param>
    /// <param name="timeProvider">Optional time provider for tests.</param>
    public ProviderModelLister(IDesktopEnvironmentPaths environmentPaths, HttpClient? httpClient = null, TimeProvider? timeProvider = null)
    {
        this.environmentPaths = environmentPaths;
        this.httpClient = httpClient ?? new HttpClient();
        this.timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <summary>
    /// Lists the models exposed by a provider preset. Falls back to a hardcoded
    /// list for providers that do not expose <c>/models</c>.
    /// </summary>
    /// <param name="preset">The provider preset to query.</param>
    /// <param name="apiKey">API key for authenticated calls; may be null for local servers.</param>
    /// <param name="forceRefresh">When true, bypass the on-disk cache.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A <see cref="ListProviderModelsResult"/> with the models and any error.</returns>
    public async Task<ListProviderModelsResult> ListAsync(
        ProviderPreset preset,
        string? apiKey,
        bool forceRefresh = false,
        CancellationToken cancellationToken = default)
    {
        if (preset is null) throw new ArgumentNullException(nameof(preset));

        // Anthropic: /v1/models is not exposed; return the hardcoded fallback list.
        if (string.Equals(preset.Id, "anthropic", StringComparison.OrdinalIgnoreCase))
        {
            return new ListProviderModelsResult(models: AnthropicFallbackModels,
                error: "Using fallback model list (Anthropic's OpenAI-Compatible endpoint does not expose /models).",
                fromCache: false);
        }

        // Custom: no model list.
        if (string.Equals(preset.Id, "custom", StringComparison.OrdinalIgnoreCase))
        {
            return new ListProviderModelsResult(models: [],
                error: "Custom providers do not support live model discovery.",
                fromCache: false);
        }

        // Try cache first.
        if (!forceRefresh)
        {
            var cached = TryReadCache(preset);
            if (cached is not null)
            {
                return new ListProviderModelsResult(models: cached, error: string.Empty, fromCache: true);
            }
        }

        var url = ResolveModelsUrl(preset);
        if (string.IsNullOrWhiteSpace(url))
        {
            return new ListProviderModelsResult(models: [],
                error: "Provider has no modelsSourceUrl configured.",
                fromCache: false);
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            }
            if (preset.ModelsSourceHeaders is { Count: > 0 })
            {
                foreach (var (key, value) in preset.ModelsSourceHeaders)
                {
                    request.Headers.TryAddWithoutValidation(key, value);
                }
            }

            using var response = await httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                return new ListProviderModelsResult(models: [],
                    error: $"Provider returned {(int)response.StatusCode} {response.ReasonPhrase}".Trim(),
                    fromCache: false);
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            var models = ParseModels(body, isOllama: IsOllama(preset));
            if (models.Count > 0)
            {
                TryWriteCache(preset, models);
            }
            return new ListProviderModelsResult(models: models, error: string.Empty, fromCache: false);
        }
        catch (Exception ex)
        {
            return new ListProviderModelsResult(models: [],
                error: ex.Message,
                fromCache: false);
        }
    }

    private static IReadOnlyList<string> AnthropicFallbackModels { get; } =
    [
        "claude-3-5-sonnet-latest",
        "claude-3-7-sonnet-latest",
        "claude-sonnet-4",
        "claude-opus-4"
    ];

    private static bool IsOllama(ProviderPreset preset) =>
        string.Equals(preset.Id, "ollama", StringComparison.OrdinalIgnoreCase);

    private static string? ResolveModelsUrl(ProviderPreset preset)
    {
        if (!string.IsNullOrWhiteSpace(preset.ModelsSourceUrl))
        {
            return preset.ModelsSourceUrl;
        }
        if (string.IsNullOrWhiteSpace(preset.DefaultBaseUrl))
        {
            return null;
        }
        var baseUrl = preset.DefaultBaseUrl.TrimEnd('/');
        return $"{baseUrl}/models";
    }

    private static IReadOnlyList<string> ParseModels(string body, bool isOllama)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return [];
        }

        try
        {
            var root = JsonNode.Parse(body);
            if (root is null)
            {
                return [];
            }

            var models = new List<string>();
            if (isOllama)
            {
                // Ollama shape: { "models": [{ "name": "llama3:8b", ... }, ...] }
                if (root["models"] is JsonArray ollamaModels)
                {
                    foreach (var item in ollamaModels)
                    {
                        if (item is JsonObject obj && obj["name"] is JsonValue value)
                        {
                            var name = value.GetValue<string>();
                            if (!string.IsNullOrWhiteSpace(name))
                            {
                                models.Add(name);
                            }
                        }
                    }
                }
            }
            else
            {
                // OpenAI shape: { "data": [{ "id": "gpt-4o", ... }, ...] }
                if (root["data"] is JsonArray dataArray)
                {
                    foreach (var item in dataArray)
                    {
                        if (item is JsonObject obj && obj["id"] is JsonValue value)
                        {
                            var id = value.GetValue<string>();
                            if (!string.IsNullOrWhiteSpace(id))
                            {
                                models.Add(id);
                            }
                        }
                    }
                }
            }

            return models
                .Distinct(StringComparer.Ordinal)
                .OrderBy(static m => m, StringComparer.Ordinal)
                .ToArray();
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private string CacheFilePath(ProviderPreset preset) =>
        Path.Combine(environmentPaths.HomeDirectory, ".kurisu", "model-cache", $"{SanitizeFileName(preset.Id)}.json");

    private IReadOnlyList<string>? TryReadCache(ProviderPreset preset)
    {
        try
        {
            var path = CacheFilePath(preset);
            if (!File.Exists(path))
            {
                return null;
            }
            var fileTime = File.GetLastWriteTimeUtc(path);
            if (timeProvider.GetUtcNow() - fileTime > CacheLifetime)
            {
                return null;
            }
            using var stream = File.OpenRead(path);
            using var document = JsonDocument.Parse(stream);
            if (document.RootElement.TryGetProperty("models", out var modelsElement) &&
                modelsElement.ValueKind == JsonValueKind.Array)
            {
                var models = new List<string>();
                foreach (var item in modelsElement.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String)
                    {
                        var value = item.GetString();
                        if (!string.IsNullOrWhiteSpace(value))
                        {
                            models.Add(value);
                        }
                    }
                }
                return models;
            }
        }
        catch
        {
            // Treat cache as best-effort.
        }
        return null;
    }

    private void TryWriteCache(ProviderPreset preset, IReadOnlyList<string> models)
    {
        try
        {
            var path = CacheFilePath(preset);
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrWhiteSpace(dir))
            {
                Directory.CreateDirectory(dir);
            }
            var payload = new JsonObject
            {
                ["models"] = new JsonArray(models.Select(static m => JsonValue.Create(m)).ToArray()),
                ["cachedAtUtc"] = JsonValue.Create(timeProvider.GetUtcNow())
            };
            File.WriteAllText(path, payload.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        }
        catch
        {
            // Best-effort.
        }
    }

    private static string SanitizeFileName(string input)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var buffer = new StringBuilder(input.Length);
        foreach (var ch in input)
        {
            buffer.Append(Array.IndexOf(invalid, ch) >= 0 ? '_' : ch);
        }
        return buffer.ToString();
    }
}

/// <summary>
/// Result of a model list query.
/// </summary>
public sealed class ListProviderModelsResult
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ListProviderModelsResult"/> class.
    /// </summary>
    public ListProviderModelsResult(IReadOnlyList<string> models, string error, bool fromCache)
    {
        Models = models;
        Error = error;
        FromCache = fromCache;
    }

    /// <summary>
    /// Gets the model ids returned by the lister.
    /// </summary>
    public IReadOnlyList<string> Models { get; init; }

    /// <summary>
    /// Gets the error message (empty when the call succeeded).
    /// </summary>
    public string Error { get; init; }

    /// <summary>
    /// Gets whether the result was served from the on-disk cache.
    /// </summary>
    public bool FromCache { get; init; }
}

