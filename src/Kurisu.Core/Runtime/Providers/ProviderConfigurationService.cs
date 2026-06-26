using System.Text.Json;
using System.Text.Json.Nodes;
using Kurisu.Core.Config;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Infrastructure.Constants;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Resolves a <see cref="ResolvedProviderConfiguration"/> from a
/// <see cref="AssistantTurnRequest"/> using the multi-provider
/// configuration stored in <see cref="ProviderSettingsStore"/>.
///
/// Each provider is independent — no <c>selectedType</c>, no shared
/// <c>modelProviders</c> dict, no global "auth state". The active provider
/// is determined by (in order): <c>request.ProviderIdOverride</c>,
/// <see cref="RuntimeSelectionStore.Current"/> selection, Fallback: <c>openai</c>
/// </summary>
public sealed class ProviderConfigurationService
{
    private readonly ProviderSettingsStore providerSettings;
    private readonly IReadOnlyList<ProviderManifest> _manifests;
    private readonly RuntimeSelectionStore selection;
    private readonly ProviderHealthChecker? healthChecker;
    private readonly IDesktopEnvironmentPaths environmentPaths;
    private readonly IOptions<NativeAssistantRuntimeOptions> runtimeOptions;
    private readonly ILogger<ProviderConfigurationService> _logger;

    /// <summary>
    /// Initialises the service with its multi-provider collaborators.
    /// </summary>
    public ProviderConfigurationService(
        ProviderSettingsStore providerSettings,
        RuntimeSelectionStore selection,
        IDesktopEnvironmentPaths environmentPaths,
        IOptions<NativeAssistantRuntimeOptions> runtimeOptions,
        ProviderHealthChecker? healthChecker = null,
        ILogger<ProviderConfigurationService>? logger = null)
    {
        this.providerSettings = providerSettings;
        _manifests = ProviderCatalog.Builtins;
        this.selection = selection;
        this.environmentPaths = environmentPaths;
        this.runtimeOptions = runtimeOptions;
        this.healthChecker = healthChecker;
        _logger = logger ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<ProviderConfigurationService>.Instance;
    }

    private ProviderManifest? FindManifest(string id) =>
        _manifests.FirstOrDefault(m => string.Equals(m.Id, id, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Resolves a <see cref="ResolvedProviderConfiguration"/> for the request.
    /// Returns a placeholder (empty api key, empty endpoint) if the target
    /// provider is unknown — callers can detect this via <c>IsEmpty</c>.
    /// </summary>
    public ResolvedProviderConfiguration Resolve(AssistantTurnRequest request)
    {
        var options = runtimeOptions.Value;
        var currentSelection = selection.Current;

        var providerId = FirstNonEmpty(
            request.ProviderIdOverride,
            currentSelection.SelectedAuthType,
            "openai");
        var manifest = FindManifest(providerId);

        if (manifest is null)
        {
            _logger.LogWarning("Unknown provider {Provider}; falling back to OpenAI defaults.", providerId);
            providerId = "openai";
            manifest = FindManifest(providerId);
        }
        if (manifest is null)
            return EmptyResolution(providerId, request, options);

        var model = FirstNonEmpty(
            request.ModelOverride,
            options.Model,
            Environment.GetEnvironmentVariable("KURISU_MODEL"),
            currentSelection.SelectedModelId);
        if (string.IsNullOrWhiteSpace(model))
        {
            model = manifest.DefaultModelId ?? "default";
        }

        var baseUrl = FirstNonEmpty(
            request.EndpointOverride,
            providerSettings.ResolveBaseUrl(manifest),
            manifest.DefaultBaseUrl);

        var apiKey = FirstNonEmpty(
            request.ApiKeyOverride,
            options.ApiKey,
            providerSettings.ResolveApiKey(manifest));

        var flavor = ResolveProviderFlavor(providerId, baseUrl, manifest);
        var headers = BuildProviderHeaders(providerId, baseUrl);
        var extraBody = BuildExtraBody();

        return new ResolvedProviderConfiguration
        {
            ProviderId = providerId,
            ProviderFlavor = flavor,
            Model = model,
            Endpoint = EnsureChatCompletionsEndpoint(baseUrl),
            ApiKey = apiKey,
            ApiKeyEnvironmentVariable = FirstNonEmpty(
                manifest.ApiKeyEnvVars.FirstOrDefault(),
                ProviderEnvVars.OpenAI),
            Headers = headers,
            ExtraBody = extraBody,
            IsDashScope = IsDashScopeEndpoint(baseUrl),
        };
    }

    private static ResolvedProviderConfiguration EmptyResolution(
        string providerId, AssistantTurnRequest request, NativeAssistantRuntimeOptions options)
    {
        return new ResolvedProviderConfiguration
        {
            ProviderId = providerId,
            ProviderFlavor = "openai-compatible",
            Model = FirstNonEmpty(request.ModelOverride, options.Model, "default"),
            Endpoint = string.Empty,
            ApiKey = FirstNonEmpty(request.ApiKeyOverride, options.ApiKey),
            ApiKeyEnvironmentVariable = ProviderEnvVars.OpenAI,
            Headers = new Dictionary<string, string>(),
            ExtraBody = new JsonObject(),
            IsDashScope = false,
        };
    }

    private static string ResolveProviderFlavor(string providerId, string baseUrl, ProviderManifest manifest)
    {
        if (string.Equals(providerId, "openrouter", StringComparison.OrdinalIgnoreCase) ||
            IsOpenRouterEndpoint(baseUrl))
        {
            return "openrouter";
        }
        if (string.Equals(providerId, "deepseek", StringComparison.OrdinalIgnoreCase) ||
            IsDeepSeekEndpoint(baseUrl))
        {
            return "deepseek";
        }
        if (string.Equals(providerId, "qwen", StringComparison.OrdinalIgnoreCase) ||
            IsDashScopeEndpoint(baseUrl))
        {
            return "dashscope";
        }
        if (string.Equals(providerId, "zai", StringComparison.OrdinalIgnoreCase) ||
            IsZaiEndpoint(baseUrl))
        {
            return "zai";
        }
        if (manifest.IsOpenAiCompatible)
        {
            return "openai-compatible";
        }
        return providerId;
    }

    private static IReadOnlyDictionary<string, string> BuildProviderHeaders(string providerId, string baseUrl)
    {
        var headers = new Dictionary<string, string>(StringComparer.Ordinal);
        if (string.Equals(providerId, "openrouter", StringComparison.OrdinalIgnoreCase) ||
            IsOpenRouterEndpoint(baseUrl))
        {
            headers["HTTP-Referer"] = "https://kurisu.local";
            headers["X-Title"] = "Kurisu";
        }
        return headers;
    }

    private static JsonObject BuildExtraBody() => new();

    private static bool IsOpenRouterEndpoint(string baseUrl) =>
        baseUrl.Contains("openrouter.ai", StringComparison.OrdinalIgnoreCase);

    private static bool IsDeepSeekEndpoint(string baseUrl) =>
        baseUrl.Contains("deepseek.com", StringComparison.OrdinalIgnoreCase);

    private static bool IsDashScopeEndpoint(string baseUrl) =>
        baseUrl.Contains("dashscope.aliyuncs.com", StringComparison.OrdinalIgnoreCase) ||
        baseUrl.Contains("modelscope.cn", StringComparison.OrdinalIgnoreCase);

    private static bool IsZaiEndpoint(string baseUrl) =>
        baseUrl.Contains("api.z.ai", StringComparison.OrdinalIgnoreCase);

    private static string EnsureChatCompletionsEndpoint(string baseUrl) =>
        string.IsNullOrWhiteSpace(baseUrl)
            ? string.Empty
            : baseUrl.EndsWith("/chat/completions", StringComparison.OrdinalIgnoreCase)
                ? baseUrl
                : $"{baseUrl.TrimEnd('/')}/chat/completions";

    private static string FirstNonEmpty(params string?[] candidates) =>
        candidates.FirstOrDefault(static candidate => !string.IsNullOrWhiteSpace(candidate)) ?? string.Empty;

}