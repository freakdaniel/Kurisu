using System.Text.Json.Nodes;
using Kurisu.Core.Config;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Models;

namespace Kurisu.Core.Runtime;

/// <summary>
/// Represents the Provider Configuration Resolver
/// </summary>
/// <param name="environmentPaths">The environment paths</param>
/// <param name="configService">The config service</param>
/// <param name="modelConfigResolver">The model config resolver</param>
public sealed class ProviderConfigurationResolver(
    IDesktopEnvironmentPaths environmentPaths,
    IConfigService? configService = null,
    IModelConfigResolver? modelConfigResolver = null)
{
    internal const string OpenRouterBaseUrl = "https://openrouter.ai/api/v1";
    internal const string DeepSeekBaseUrl = "https://api.deepseek.com/v1";
    internal const string ModelScopeBaseUrl = "https://api.modelscope.cn/v1";
    private readonly IConfigService config = configService ?? new RuntimeConfigService(environmentPaths);
    private readonly IModelConfigResolver? _modelConfigResolver = modelConfigResolver;

    /// <summary>
    /// Resolves value
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <param name="options">The options</param>
    /// <returns>The resulting resolved provider configuration</returns>
    public ResolvedProviderConfiguration Resolve(
        AssistantTurnRequest request,
        NativeAssistantRuntimeOptions options)
    {
        var snapshot = config.Inspect(new WorkspacePaths { WorkspaceRoot = request.RuntimeProfile.ProjectRoot });
        var mergedSettings = snapshot.MergedSettings;
        var settingsEnvironment = snapshot.Environment;

        var authType = FirstNonEmpty(
            request.AuthTypeOverride,
            GetString(mergedSettings, "security", "auth", "selectedType"));
        if (string.IsNullOrWhiteSpace(authType))
        {
            authType = "openai";
        }

        var baseUrl = ResolveBaseUrl(mergedSettings, authType);
        var endpoint = EnsureChatCompletionsEndpoint(baseUrl);
        var apiKeyEnvVar = ResolveApiKeyEnvironmentVariable(mergedSettings, authType);
        var settingsApiKey = GetString(mergedSettings, "security", "auth", "apiKey");
        var explicitEnvVarRequired = string.Equals(authType, "openai", StringComparison.OrdinalIgnoreCase);

        var apiKey = ResolveApiKey(
            request.ApiKeyOverride,
            options,
            settingsEnvironment,
            apiKeyEnvVar,
            settingsApiKey,
            explicitEnvVarRequired);
        var model = ResolveConfiguredModel(authType, request, options, settingsEnvironment, mergedSettings);
        var flavor = ResolveProviderFlavor(authType, baseUrl, endpoint);
        var headers = BuildProviderHeaders(authType, baseUrl, endpoint, mergedSettings, model);
        var extraBody = BuildExtraBody(mergedSettings, model);
        var isDashScope = flavor == "dashscope";

        return new ResolvedProviderConfiguration
        {
            AuthType = authType,
            ProviderFlavor = flavor,
            Model = model,
            Endpoint = endpoint,
            ApiKey = apiKey,
            ApiKeyEnvironmentVariable = apiKeyEnvVar,
            Headers = headers,
            ExtraBody = extraBody,
            IsDashScope = isDashScope
        };
    }

    private string ResolveBaseUrl(JsonObject mergedSettings, string authType)
    {
        var configured = FindModelProviderBaseUrl(mergedSettings, authType);
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured;
        }
        var settingsBaseUrl = GetString(mergedSettings, "security", "auth", "baseUrl");
        if (!string.IsNullOrWhiteSpace(settingsBaseUrl))
        {
            return settingsBaseUrl;
        }
        return ResolveDefaultBaseUrl(authType);
    }

    private string ResolveApiKeyEnvironmentVariable(JsonObject mergedSettings, string authType)
    {
        var fromProvider = FindModelProviderEnvKey(mergedSettings, authType);
        if (!string.IsNullOrWhiteSpace(fromProvider))
        {
            return fromProvider;
        }
        return ResolveDefaultApiKeyEnvironmentVariable(authType);
    }

    private static string ResolveApiKey(
        string requestApiKey,
        NativeAssistantRuntimeOptions options,
        IReadOnlyDictionary<string, string> settingsEnvironment,
        string apiKeyEnvironmentVariable,
        string settingsApiKey,
        bool explicitEnvironmentVariableRequired)
    {
        if (!string.IsNullOrWhiteSpace(requestApiKey))
        {
            return requestApiKey;
        }

        if (!string.IsNullOrWhiteSpace(options.ApiKey))
        {
            return options.ApiKey;
        }

        if (!string.IsNullOrWhiteSpace(apiKeyEnvironmentVariable))
        {
            var environmentApiKey = FirstNonEmpty(
                Environment.GetEnvironmentVariable(apiKeyEnvironmentVariable),
                ReadEnvironmentValue(settingsEnvironment, apiKeyEnvironmentVariable));
            if (!string.IsNullOrWhiteSpace(environmentApiKey))
            {
                return environmentApiKey;
            }
        }

        if (explicitEnvironmentVariableRequired)
        {
            return string.Empty;
        }

        return settingsApiKey;
    }

    private static string ResolveDefaultApiKeyEnvironmentVariable(string authType) =>
        authType switch
        {
            "openrouter" => "OPENROUTER_API_KEY",
            "deepseek" => "DEEPSEEK_API_KEY",
            "modelscope" => "MODELSCOPE_API_KEY",
            _ => "OPENAI_API_KEY"
        };

    private static string ResolveDefaultBaseUrl(string authType) =>
        authType switch
        {
            "openrouter" => OpenRouterBaseUrl,
            "deepseek" => DeepSeekBaseUrl,
            "modelscope" => ModelScopeBaseUrl,
            _ => "https://api.openai.com/v1"
        };

    private static string ResolveConfiguredModel(
        string authType,
        AssistantTurnRequest request,
        NativeAssistantRuntimeOptions options,
        IReadOnlyDictionary<string, string> settingsEnvironment,
        JsonObject mergedSettings)
    {
        return FirstNonEmpty(
            request.ModelOverride,
            options.Model,
            ReadEnvironmentValue(settingsEnvironment, "KURISU_MODEL"),
            Environment.GetEnvironmentVariable("KURISU_MODEL"),
            GetString(mergedSettings, "model", "name"));
    }

    private static string ResolveProviderFlavor(string authType, string baseUrl, string endpoint)
    {
        if (string.Equals(authType, "openrouter", StringComparison.OrdinalIgnoreCase) ||
            OpenAiCompatibleProtocol.IsOpenRouterEndpoint(baseUrl) ||
            OpenAiCompatibleProtocol.IsOpenRouterEndpoint(endpoint))
        {
            return "openrouter";
        }

        if (string.Equals(authType, "deepseek", StringComparison.OrdinalIgnoreCase) ||
            OpenAiCompatibleProtocol.IsDeepSeekEndpoint(baseUrl) ||
            OpenAiCompatibleProtocol.IsDeepSeekEndpoint(endpoint))
        {
            return "deepseek";
        }

        if (string.Equals(authType, "modelscope", StringComparison.OrdinalIgnoreCase) ||
            OpenAiCompatibleProtocol.IsModelScopeEndpoint(baseUrl) ||
            OpenAiCompatibleProtocol.IsModelScopeEndpoint(endpoint))
        {
            return "modelscope";
        }

        return "openai-compatible";
    }

    private static IReadOnlyDictionary<string, string> BuildProviderHeaders(
        string authType,
        string baseUrl,
        string endpoint,
        JsonObject mergedSettings,
        string model)
    {
        var headers = new Dictionary<string, string>(StringComparer.Ordinal);
        if (string.Equals(authType, "openrouter", StringComparison.OrdinalIgnoreCase))
        {
            headers["HTTP-Referer"] = "https://kurisu.local";
            headers["X-OpenRouter-Title"] = "Kurisu";
        }

        var settingsHeaders = GetNode(mergedSettings, ["model", "generationConfig", "customHeaders"]) as JsonObject;
        if (settingsHeaders is not null)
        {
            foreach (var pair in settingsHeaders)
            {
                headers[pair.Key] = pair.Value?.GetValue<string>() ?? string.Empty;
            }
        }

        var providerHeaders = GetNode(FindModelProviderObject(mergedSettings, authType), ["generationConfig", "customHeaders"]) as JsonObject;
        if (providerHeaders is not null)
        {
            foreach (var pair in providerHeaders)
            {
                headers[pair.Key] = pair.Value?.GetValue<string>() ?? string.Empty;
            }
        }

        return headers;
    }

    private static JsonObject BuildExtraBody(JsonObject mergedSettings, string model)
    {
        var extraBody = new JsonObject();
        var settingsExtra = GetNode(mergedSettings, ["model", "generationConfig", "extra_body"]) as JsonObject;
        if (settingsExtra is not null)
        {
            foreach (var pair in settingsExtra)
            {
                extraBody[pair.Key] = pair.Value?.DeepClone();
            }
        }

        var providerExtra = GetNode(FindModelProviderObject(mergedSettings, "openai"), ["generationConfig", "extra_body"]) as JsonObject;
        if (providerExtra is not null)
        {
            foreach (var pair in providerExtra)
            {
                extraBody[pair.Key] = pair.Value?.DeepClone();
            }
        }

        return extraBody;
    }

    private static string FindModelProviderBaseUrl(JsonObject mergedSettings, string authType) =>
        FindModelProviderObject(mergedSettings, authType)?["baseUrl"]?.GetValue<string?>() ?? string.Empty;

    private static string FindModelProviderEnvKey(JsonObject mergedSettings, string authType) =>
        FindModelProviderObject(mergedSettings, authType)?["envKey"]?.GetValue<string?>() ?? string.Empty;

    private static JsonObject? FindModelProviderObject(JsonObject mergedSettings, string authType)
    {
        if (GetNode(mergedSettings, ["modelProviders", authType]) is not JsonArray providers)
        {
            return null;
        }

        return providers
            .OfType<JsonObject>()
            .FirstOrDefault();
    }

    private static string ReadEnvironmentValue(
        IReadOnlyDictionary<string, string> settingsEnvironment,
        params string[] keys)
    {
        foreach (var key in keys)
        {
            if (!string.IsNullOrWhiteSpace(key) &&
                settingsEnvironment.TryGetValue(key, out var value) &&
                !string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return string.Empty;
    }

    private static string EnsureChatCompletionsEndpoint(string baseUrl) =>
        string.IsNullOrWhiteSpace(baseUrl)
            ? string.Empty
            : baseUrl.EndsWith("/chat/completions", StringComparison.OrdinalIgnoreCase)
                ? baseUrl
                : $"{baseUrl.TrimEnd('/')}/chat/completions";

    private static string FirstNonEmpty(params string?[] candidates) =>
        candidates.FirstOrDefault(static candidate => !string.IsNullOrWhiteSpace(candidate)) ?? string.Empty;

    private static string GetString(JsonObject root, params string[] path) =>
        GetNode(root, path) is JsonValue value && value.TryGetValue<string>(out var result)
            ? result ?? string.Empty
            : string.Empty;

    private static JsonNode? GetNode(JsonObject? root, IReadOnlyList<string> path)
    {
        JsonNode? current = root;
        foreach (var segment in path)
        {
            if (current is not JsonObject currentObject ||
                !currentObject.TryGetPropertyValue(segment, out current))
            {
                return null;
            }
        }
        return current;
    }
}
