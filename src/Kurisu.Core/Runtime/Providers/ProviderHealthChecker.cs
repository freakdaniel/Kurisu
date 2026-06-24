using System.Collections.Concurrent;
using System.Net.Http.Headers;
using Kurisu.Core.Infrastructure;
using Microsoft.Extensions.Logging;

namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Result of probing a provider for reachability and credentials.
/// </summary>
/// <param name="Reachable">Whether the live model list endpoint (or default URL) answered.</param>
/// <param name="HasApiKey">Whether any api key was resolved (store or env).</param>
/// <param name="Latency">Round-trip latency of the reachability probe.</param>
/// <param name="Error">Optional human-readable failure description.</param>
public sealed record ProviderHealth(
    bool Reachable,
    bool HasApiKey,
    TimeSpan? Latency,
    string? Error);

/// <summary>
/// Probes providers for reachability + credentials. Caches the last result
/// per provider for five minutes to avoid hammering the network when the UI
/// renders status indicators.
/// </summary>
public sealed class ProviderHealthChecker
{
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ProbeTimeout = TimeSpan.FromSeconds(5);

    private readonly ProviderSettingsStore _settings;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<ProviderHealthChecker> _logger;
    private readonly ConcurrentDictionary<string, (DateTimeOffset At, ProviderHealth Health)> _cache = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Creates a new health checker that resolves API keys via
    /// <paramref name="settings"/> and issues HTTP probes through
    /// <paramref name="httpFactory"/>.
    /// </summary>
    /// <param name="settings">Source of configured providers and API keys.</param>
    /// <param name="httpFactory">Factory that produces HttpClient instances.</param>
    /// <param name="logger">Logger for diagnostics.</param>
    public ProviderHealthChecker(
        ProviderSettingsStore settings,
        IHttpClientFactory httpFactory,
        ILogger<ProviderHealthChecker> logger)
    {
        _settings = settings;
        _httpFactory = httpFactory;
        _logger = logger;
    }

    /// <summary>
    /// Probes the provider identified by <paramref name="providerId"/>. The
    /// returned <see cref="ProviderHealth"/> is cached for a short period to
    /// avoid repeating the network probe on every UI render.
    /// </summary>
    public async Task<ProviderHealth> CheckAsync(string providerId, CancellationToken ct = default)
    {
        var manifest = ProviderCatalog.FindById(providerId);
        if (manifest is null)
        {
            return new ProviderHealth(Reachable: false, HasApiKey: false, Latency: null, Error: $"Unknown provider '{providerId}'");
        }
        return await CheckAsync(manifest, ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Probes a known manifest. Same caching semantics as the id-based overload.
    /// </summary>
    public async Task<ProviderHealth> CheckAsync(ProviderManifest manifest, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        if (_cache.TryGetValue(manifest.Id, out var cached) && now - cached.At < CacheLifetime)
        {
            return cached.Health;
        }

        var apiKey = _settings.ResolveApiKey(manifest);
        var baseUrl = _settings.ResolveBaseUrl(manifest);
        var health = await ProbeAsync(manifest, baseUrl, apiKey, ct).ConfigureAwait(false);

        _cache[manifest.Id] = (now, health);
        return health;
    }

    /// <summary>Forgets any cached health result for the given provider.</summary>
    public void Invalidate(string providerId) => _cache.TryRemove(providerId, out _);

    private async Task<ProviderHealth> ProbeAsync(
        ProviderManifest manifest,
        string? baseUrl,
        string? apiKey,
        CancellationToken ct)
    {
        var hasKey = !string.IsNullOrWhiteSpace(apiKey);
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return new ProviderHealth(
                Reachable: false,
                HasApiKey: hasKey,
                Latency: null,
                Error: "No base URL configured");
        }

        var probeUrl = manifest.ModelsSourceUrl ?? baseUrl.TrimEnd('/') + "/models";

        try
        {
            var http = _httpFactory.CreateClient("provider-health");
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(ProbeTimeout);

            using var request = new HttpRequestMessage(HttpMethod.Get, probeUrl);
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            }

            var sw = System.Diagnostics.Stopwatch.StartNew();
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token).ConfigureAwait(false);
            sw.Stop();

            if (!response.IsSuccessStatusCode)
            {
                return new ProviderHealth(
                    Reachable: false,
                    HasApiKey: hasKey,
                    Latency: sw.Elapsed,
                    Error: $"HTTP {(int)response.StatusCode}");
            }

            return new ProviderHealth(
                Reachable: true,
                HasApiKey: hasKey,
                Latency: sw.Elapsed,
                Error: null);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Provider health probe failed for {Provider}", manifest.Id);
            return new ProviderHealth(
                Reachable: false,
                HasApiKey: hasKey,
                Latency: null,
                Error: ex.GetType().Name);
        }
    }
}