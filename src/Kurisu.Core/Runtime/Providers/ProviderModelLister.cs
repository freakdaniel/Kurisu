using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using Kurisu.Core.Infrastructure;

namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Fetches the live model list from a provider's <c>/v1/models</c> endpoint (or
/// Ollama's <c>/api/tags</c>). Results are cached on disk for 1 hour under
/// <see cref="KurisuPaths.ModelCacheDirectory"/>.
/// </summary>
public sealed class ProviderModelLister
{
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromHours(1);
    private static readonly IReadOnlyList<string> AnthropicFallbackModels =
    [
        "claude-3-5-sonnet-latest",
        "claude-3-7-sonnet-latest",
        "claude-sonnet-4",
        "claude-opus-4"
    ];

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
    /// Lists the models exposed by a provider manifest. Falls back to the
    /// manifest's <see cref="ProviderManifest.KnownModels"/> or a hardcoded
    /// list for providers that do not expose <c>/models</c>.
    /// </summary>
    /// <param name="manifest">The provider manifest to query.</param>
    /// <param name="apiKey">API key for authenticated calls; may be null for local servers.</param>
    /// <param name="forceRefresh">When true, bypass the on-disk cache.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A <see cref="ListProviderModelsResult"/> with the models and any error.</returns>
    public async Task<ListProviderModelsResult> ListAsync(
        ProviderManifest manifest,
        string? apiKey,
        bool forceRefresh = false,
        CancellationToken cancellationToken = default)
    {
        if (manifest is null) throw new ArgumentNullException(nameof(manifest));

        if (string.Equals(manifest.Id, "anthropic", StringComparison.OrdinalIgnoreCase))
        {
            return new ListProviderModelsResult(
                models: AnthropicFallbackModels,
                error: "Using fallback model list (Anthropic's OpenAI-Compatible endpoint does not expose /models).",
                fromCache: false);
        }

        if (string.Equals(manifest.Id, "custom", StringComparison.OrdinalIgnoreCase))
        {
            return new ListProviderModelsResult(
                models: manifest.KnownModels?.Keys.ToArray() ?? [],
                error: "Custom providers do not support live model discovery.",
                fromCache: false);
        }

        if (!forceRefresh)
        {
            var cached = TryReadCache(manifest);
            if (cached is not null)
            {
                return new ListProviderModelsResult(models: cached, error: string.Empty, fromCache: true);
            }
        }

        var url = ResolveModelsUrl(manifest);
        if (string.IsNullOrWhiteSpace(url))
        {
            return new ListProviderModelsResult(models: [], error: "Provider has no modelsSourceUrl configured.", fromCache: false);
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            }
            if (manifest.ModelsSourceHeaders is { Count: > 0 })
            {
                foreach (var (key, value) in manifest.ModelsSourceHeaders)
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
            var models = ParseModels(body, isOllama: IsOllama(manifest));
            if (models.Count > 0)
            {
                TryWriteCache(manifest, models);
            }
            return new ListProviderModelsResult(models: models, error: string.Empty, fromCache: false);
        }
        catch (Exception ex)
        {
            return new ListProviderModelsResult(models: [], error: ex.Message, fromCache: false);
        }
    }

    private static bool IsOllama(ProviderManifest manifest) =>
        string.Equals(manifest.Id, "ollama", StringComparison.OrdinalIgnoreCase);

    private static string? ResolveModelsUrl(ProviderManifest manifest)
    {
        if (!string.IsNullOrWhiteSpace(manifest.ModelsSourceUrl))
        {
            return manifest.ModelsSourceUrl;
        }
        if (string.IsNullOrWhiteSpace(manifest.DefaultBaseUrl))
        {
            return null;
        }
        return $"{manifest.DefaultBaseUrl.TrimEnd('/')}/models";
    }

    private static IReadOnlyList<string> ParseModels(string body, bool isOllama)
    {
        if (string.IsNullOrWhiteSpace(body)) return [];

        try
        {
            var root = JsonNode.Parse(body);
            if (root is null) return [];

            var models = new List<string>();
            if (isOllama)
            {
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

    private string CacheFilePath(ProviderManifest manifest) =>
        KurisuPaths.ModelCacheFile(environmentPaths.HomeDirectory, manifest.Id);

    private IReadOnlyList<string>? TryReadCache(ProviderManifest manifest)
    {
        try
        {
            var path = CacheFilePath(manifest);
            if (!File.Exists(path)) return null;
            var fileTime = File.GetLastWriteTimeUtc(path);
            if (timeProvider.GetUtcNow() - fileTime > CacheLifetime) return null;
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
            // best-effort
        }
        return null;
    }

    private void TryWriteCache(ProviderManifest manifest, IReadOnlyList<string> models)
    {
        try
        {
            var path = CacheFilePath(manifest);
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrWhiteSpace(dir)) Directory.CreateDirectory(dir);
            var payload = new JsonObject
            {
                ["models"] = new JsonArray(models.Select(static m => JsonValue.Create(m)).ToArray()),
                ["cachedAtUtc"] = JsonValue.Create(timeProvider.GetUtcNow())
            };
            File.WriteAllText(path, payload.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        }
        catch
        {
            // best-effort
        }
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