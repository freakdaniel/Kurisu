using System.Text.Json;
using System.Text.Json.Nodes;
using Kurisu.Core.Compatibility;
using Kurisu.Core.Config;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Models;
using Kurisu.Core.Runtime;
using Kurisu.Core.Runtime.Providers;

namespace Kurisu.Core.Auth;

/// <summary>
/// Represents the Auth Flow Service
/// </summary>
/// <param name="runtimeProfileService">The runtime profile service</param>
/// <param name="environmentPaths">The environment paths</param>
/// <param name="configService">The config service</param>
public sealed class AuthFlowService(
    KurisuRuntimeProfileService runtimeProfileService,
    IDesktopEnvironmentPaths environmentPaths,
    IConfigService? configService = null) : IAuthFlowService
{
    private const string CodingPlanEnvKey = "BAILIAN_CODING_PLAN_API_KEY";
    private readonly IConfigService config = configService ?? new RuntimeConfigService(environmentPaths);

    /// <summary>
    /// Occurs when Auth Changed
    /// </summary>
    public event EventHandler<AuthStatusSnapshot>? AuthChanged;

    /// <summary>
    /// Gets status
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <returns>The resulting auth status snapshot</returns>
    public AuthStatusSnapshot GetStatus(WorkspacePaths paths)
    {
        var runtimeProfile = runtimeProfileService.Inspect(paths);
        var mergedSettings = config.Inspect(paths).MergedSettings;

        var selectedType = FirstNonEmpty(GetString(mergedSettings, "security", "auth", "selectedType"), "openai");
        var selectedScope = ResolveSelectedScope(runtimeProfile);
        var model = GetString(mergedSettings, "model", "name");
        var endpoint = ResolveEndpoint(mergedSettings, selectedType, model);
        var apiKeyEnvironmentVariable = ResolveApiKeyEnvironmentVariable(mergedSettings, selectedType, model);
        var hasApiKey = ResolveHasApiKey(mergedSettings, selectedType, apiKeyEnvironmentVariable);

        return new AuthStatusSnapshot
        {
            SelectedType = selectedType,
            SelectedScope = selectedScope,
            DisplayName = ResolveDisplayName(mergedSettings, selectedType),
            Status = hasApiKey ? "connected" : "missing-credentials",
            Model = model,
            Endpoint = endpoint,
            ApiKeyEnvironmentVariable = apiKeyEnvironmentVariable,
            HasApiKey = hasApiKey,
            LastError = hasApiKey
                ? string.Empty
                : ResolveMissingCredentialMessage(selectedType, apiKeyEnvironmentVariable)
        };
    }

    /// <summary>
    /// Executes configure open ai compatible async
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    public async Task<AuthStatusSnapshot> ConfigureOpenAiCompatibleAsync(
        WorkspacePaths paths,
        ConfigureOpenAiCompatibleAuthRequest request,
        CancellationToken cancellationToken = default)
    {
        var runtimeProfile = runtimeProfileService.Inspect(paths);
        var settingsPath = config.ResolveSettingsPath(paths, request.Scope);
        var root = LoadSettingsRoot(settingsPath);

        // Resolve preset defaults (auto-fill baseUrl, env-var, model).
        var preset = ProviderPresetCatalog.FindById(request.PresetId);
        var presetAuthType = string.IsNullOrWhiteSpace(request.AuthType) ? "openai" : request.AuthType.Trim();
        if (preset is not null && !string.IsNullOrWhiteSpace(preset.Id))
        {
            presetAuthType = preset.Id;
        }
        var presetBaseUrl = preset?.DefaultBaseUrl ?? string.Empty;
        var presetEnvVar = preset?.ApiKeyEnvVars.FirstOrDefault() ?? "OPENAI_API_KEY";

        var baseUrl = string.IsNullOrWhiteSpace(request.BaseUrl) ? presetBaseUrl : request.BaseUrl;
        var envVar = string.IsNullOrWhiteSpace(request.ApiKeyEnvironmentVariable) ? presetEnvVar : request.ApiKeyEnvironmentVariable;
        var model = string.IsNullOrWhiteSpace(request.Model) ? preset?.DefaultModelId ?? string.Empty : request.Model;

        SetValue(root, "security", "auth", "selectedType", presetAuthType);
        SetValue(root, "security", "auth", "baseUrl", baseUrl);
        SetValue(root, "model", "name", model);

        if (!string.IsNullOrWhiteSpace(request.ApiKey))
        {
            if (!string.IsNullOrWhiteSpace(envVar))
            {
                SetValue(root, "env", envVar, request.ApiKey);
                RemoveValue(root, "security", "auth", "apiKey");
            }
            else
            {
                SetValue(root, "security", "auth", "apiKey", request.ApiKey);
            }
        }

        UpsertModelProvider(root, presetAuthType, model, baseUrl, envVar);
        SaveSettingsRoot(settingsPath, root);
        return PublishStatus(paths);
    }

    /// <summary>
    /// Executes configure coding plan async
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    public Task<AuthStatusSnapshot> ConfigureCodingPlanAsync(
        WorkspacePaths paths,
        ConfigureCodingPlanAuthRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ApiKey))
        {
            throw new InvalidOperationException("Coding Plan API key is required.");
        }

        var runtimeProfile = runtimeProfileService.Inspect(paths);
        var settingsPath = config.ResolveSettingsPath(paths, request.Scope);
        var root = LoadSettingsRoot(settingsPath);
        var region = string.Equals(request.Region, "global", StringComparison.OrdinalIgnoreCase) ? "global" : "china";
        var template = CreateCodingPlanTemplate(region);
        var preferredModel = !string.IsNullOrWhiteSpace(request.Model) &&
                             template.Any(item => string.Equals(item.Id, request.Model, StringComparison.OrdinalIgnoreCase))
            ? request.Model
            : template[0].Id;

        SetValue(root, "security", "auth", "selectedType", "openai");
        SetValue(root, "env", CodingPlanEnvKey, request.ApiKey);
        SetValue(root, "codingPlan", "region", region);
        SetValue(root, "codingPlan", "version", ComputeTemplateVersion(template));
        SetValue(root, "model", "name", preferredModel);
        ReplaceCodingPlanProviders(root, template);

        SaveSettingsRoot(settingsPath, root);
        return Task.FromResult(PublishStatus(paths));
    }

    /// <summary>
    /// Disconnects async
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    public Task<AuthStatusSnapshot> DisconnectAsync(
        WorkspacePaths paths,
        DisconnectAuthRequest request,
        CancellationToken cancellationToken = default)
    {
        var runtimeProfile = runtimeProfileService.Inspect(paths);
        var settingsPath = config.ResolveSettingsPath(paths, request.Scope);
        var root = LoadSettingsRoot(settingsPath);

        RemoveValue(root, "security", "auth", "selectedType");
        RemoveValue(root, "security", "auth", "apiKey");
        RemoveValue(root, "security", "auth", "baseUrl");
        RemoveValue(root, "codingPlan");
        RemoveValue(root, "env", CodingPlanEnvKey);
        SaveSettingsRoot(settingsPath, root);

        return Task.FromResult(PublishStatus(paths));
    }

    private string ResolveSelectedScope(KurisuRuntimeProfile runtimeProfile)
    {
        var projectSettingsPath = Path.Combine(runtimeProfile.ProjectRoot, ".kurisu", "settings.json");
        var userSettingsPath = Path.Combine(runtimeProfile.GlobalKurisuDirectory, "settings.json");

        return SettingsHasSelectedType(projectSettingsPath)
            ? "project"
            : SettingsHasSelectedType(userSettingsPath)
                ? "user"
                : "user";
    }

    private static bool SettingsHasSelectedType(string settingsPath)
    {
        if (!File.Exists(settingsPath))
        {
            return false;
        }

        try
        {
            var root = JsonNode.Parse(File.ReadAllText(settingsPath)) as JsonObject;
            return !string.IsNullOrWhiteSpace(GetString(root, "security", "auth", "selectedType"));
        }
        catch
        {
            return false;
        }
    }

    private static string ResolveDisplayName(JsonObject mergedSettings, string selectedType)
    {
        if (string.Equals(selectedType, "openrouter", StringComparison.OrdinalIgnoreCase))
        {
            return "OpenRouter";
        }

        if (string.Equals(selectedType, "deepseek", StringComparison.OrdinalIgnoreCase))
        {
            return "DeepSeek";
        }

        if (string.Equals(selectedType, "modelscope", StringComparison.OrdinalIgnoreCase))
        {
            return "ModelScope";
        }

        return !string.IsNullOrWhiteSpace(GetString(mergedSettings, "codingPlan", "region"))
            ? "Alibaba Cloud Coding Plan"
            : "OpenAI-compatible";
    }

    private static string ResolveEndpoint(
        JsonObject mergedSettings,
        string selectedType,
        string model)
    {
        var baseUrl = FirstNonEmpty(
            FindModelProviderBaseUrl(mergedSettings, selectedType, model),
            GetString(mergedSettings, "security", "auth", "baseUrl"),
            ResolveDefaultBaseUrl(selectedType));
        return EnsureChatCompletionsEndpoint(baseUrl);
    }

    private static string ResolveApiKeyEnvironmentVariable(JsonObject mergedSettings, string selectedType, string model)
    {
        return FirstNonEmpty(
            FindModelProviderEnvKey(mergedSettings, selectedType, model),
            ResolveDefaultApiKeyEnvironmentVariable(selectedType));
    }

    private static bool ResolveHasApiKey(
        JsonObject mergedSettings,
        string selectedType,
        string environmentVariableName)
    {
        var settingsEnv = GetNode(mergedSettings, ["env"]) as JsonObject;
        var configuredInSettingsEnv = settingsEnv?[environmentVariableName]?.GetValue<string?>() ?? string.Empty;
        var configuredInProcessEnv = Environment.GetEnvironmentVariable(environmentVariableName) ?? string.Empty;
        var configuredInline = GetString(mergedSettings, "security", "auth", "apiKey");

        return !string.IsNullOrWhiteSpace(FirstNonEmpty(configuredInProcessEnv, configuredInSettingsEnv, configuredInline));
    }

    private static string BuildMissingCredentialMessage(string selectedType, string environmentVariableName) =>
        $"Missing API key. Set '{environmentVariableName}' or configure an inline API key.";

    private static string ResolveDefaultApiKeyEnvironmentVariable(string selectedType) =>
        selectedType switch
        {
            "openrouter" => "OPENROUTER_API_KEY",
            "deepseek" => "DEEPSEEK_API_KEY",
            "modelscope" => "MODELSCOPE_API_KEY",
            _ => "OPENAI_API_KEY"
        };

    private static string ResolveDefaultBaseUrl(string selectedType) =>
        selectedType switch
        {
            "openrouter" => ProviderConfigurationResolver.OpenRouterBaseUrl,
            "deepseek" => ProviderConfigurationResolver.DeepSeekBaseUrl,
            "modelscope" => ProviderConfigurationResolver.ModelScopeBaseUrl,
            _ => "https://api.openai.com/v1"
        };

    private static string ResolveMissingCredentialMessage(string selectedType, string environmentVariableName) =>
        BuildMissingCredentialMessage(selectedType, environmentVariableName);

    private AuthStatusSnapshot PublishStatus(WorkspacePaths paths)
    {
        var snapshot = GetStatus(paths);
        AuthChanged?.Invoke(this, snapshot);
        return snapshot;
    }

    private static string FindModelProviderBaseUrl(JsonObject mergedSettings, string authType, string modelId) =>
        FindModelProviderObject(mergedSettings, authType, modelId)?["baseUrl"]?.GetValue<string?>() ?? string.Empty;

    private static string FindModelProviderEnvKey(JsonObject mergedSettings, string authType, string modelId) =>
        FindModelProviderObject(mergedSettings, authType, modelId)?["envKey"]?.GetValue<string?>() ?? string.Empty;

    private static JsonObject? FindModelProviderObject(JsonObject mergedSettings, string authType, string modelId)
    {
        if (string.IsNullOrWhiteSpace(modelId) ||
            GetNode(mergedSettings, ["modelProviders", authType]) is not JsonArray providers)
        {
            return null;
        }

        return providers
            .OfType<JsonObject>()
            .FirstOrDefault(provider => string.Equals(provider["id"]?.GetValue<string?>(), modelId, StringComparison.OrdinalIgnoreCase));
    }

    private static JsonObject LoadSettingsRoot(string path)
    {
        if (!File.Exists(path))
        {
            return [];
        }

        return JsonNode.Parse(File.ReadAllText(path)) as JsonObject ?? [];
    }

    private static void SaveSettingsRoot(string path, JsonObject root)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
    }

    private static void UpsertModelProvider(JsonObject root, string authType, string model, string baseUrl, string envKey)
    {
        if (string.IsNullOrWhiteSpace(model))
        {
            return;
        }

        var modelProviders = root["modelProviders"] as JsonObject ?? [];
        root["modelProviders"] = modelProviders;
        var authProviders = modelProviders[authType] as JsonArray ?? [];
        modelProviders[authType] = authProviders;

        var existing = authProviders
            .OfType<JsonObject>()
            .FirstOrDefault(provider => string.Equals(provider["id"]?.GetValue<string?>(), model, StringComparison.OrdinalIgnoreCase));

        existing ??= new JsonObject();
        existing["id"] = model;
        existing["baseUrl"] = string.IsNullOrWhiteSpace(baseUrl) ? null : baseUrl;
        existing["envKey"] = string.IsNullOrWhiteSpace(envKey) ? null : envKey;

        if (!authProviders.OfType<JsonObject>().Contains(existing))
        {
            authProviders.Add(existing);
        }
    }

    private static void ReplaceCodingPlanProviders(JsonObject root, IReadOnlyList<CodingPlanModel> template)
    {
        var modelProviders = root["modelProviders"] as JsonObject ?? [];
        root["modelProviders"] = modelProviders;
        var openAiProviders = modelProviders["openai"] as JsonArray ?? [];

        var updated = new JsonArray();
        foreach (var model in template)
        {
            updated.Add(
                new JsonObject
                {
                    ["id"] = model.Id,
                    ["name"] = model.Name,
                    ["baseUrl"] = model.BaseUrl,
                    ["envKey"] = CodingPlanEnvKey,
                    ["generationConfig"] = model.GenerationConfig.DeepClone()
                });
        }

        foreach (var provider in openAiProviders.OfType<JsonObject>().Where(static provider => !IsCodingPlanProvider(provider)))
        {
            updated.Add(provider.DeepClone());
        }

        modelProviders["openai"] = updated;
    }

    private static bool IsCodingPlanProvider(JsonObject provider) =>
        string.Equals(provider["envKey"]?.GetValue<string?>(), CodingPlanEnvKey, StringComparison.OrdinalIgnoreCase) &&
        provider["baseUrl"]?.GetValue<string?>() is { } baseUrl &&
        (string.Equals(baseUrl, "https://coding.dashscope.aliyuncs.com/v1", StringComparison.OrdinalIgnoreCase) ||
         string.Equals(baseUrl, "https://coding-intl.dashscope.aliyuncs.com/v1", StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<CodingPlanModel> CreateCodingPlanTemplate(string region)
    {
        var baseUrl = string.Equals(region, "global", StringComparison.OrdinalIgnoreCase)
            ? "https://coding-intl.dashscope.aliyuncs.com/v1"
            : "https://coding.dashscope.aliyuncs.com/v1";
        var prefix = string.Equals(region, "global", StringComparison.OrdinalIgnoreCase)
            ? "[ModelStudio Coding Plan for Global/Intl]"
            : "[ModelStudio Coding Plan]";

        return
        [
            new CodingPlanModel("qwen3-coder-plus", $"{prefix} qwen3-coder-plus", baseUrl, new JsonObject { ["contextWindowSize"] = 1000000 }),
            new CodingPlanModel("qwen3-coder-next", $"{prefix} qwen3-coder-next", baseUrl, new JsonObject { ["contextWindowSize"] = 262144 }),
            new CodingPlanModel("qwen3.5-plus", $"{prefix} qwen3.5-plus", baseUrl, new JsonObject
            {
                ["extra_body"] = new JsonObject { ["enable_thinking"] = true },
                ["contextWindowSize"] = 1000000
            })
        ];
    }

    private static string ComputeTemplateVersion(IReadOnlyList<CodingPlanModel> template)
    {
        var json = JsonSerializer.Serialize(template.Select(item => new { item.Id, item.Name, item.BaseUrl }));
        var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(json));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static void SetValue(JsonObject root, string path0, string path1, string path2, string value)
    {
        var target = EnsurePath(root, [path0, path1]);
        target[path2] = string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static void SetValue(JsonObject root, string path0, string path1, string value)
    {
        var target = EnsurePath(root, [path0]);
        target[path1] = string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static void RemoveValue(JsonObject root, params string[] path)
    {
        if (path.Length == 0)
        {
            return;
        }

        if (path.Length == 1)
        {
            root.Remove(path[0]);
            return;
        }

        if (GetNode(root, path[..^1]) is JsonObject parent)
        {
            parent.Remove(path[^1]);
        }
    }

    private static JsonObject EnsurePath(JsonObject root, IReadOnlyList<string> path)
    {
        var current = root;
        foreach (var segment in path)
        {
            if (current[segment] is not JsonObject next)
            {
                next = new JsonObject();
                current[segment] = next;
            }

            current = next;
        }

        return current;
    }

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

    private static string GetString(JsonObject? root, params string[] path) =>
        GetNode(root, path) is JsonValue value && value.TryGetValue<string>(out var result)
            ? result ?? string.Empty
            : string.Empty;

    private static string FirstNonEmpty(params string?[] candidates) =>
        candidates.FirstOrDefault(static candidate => !string.IsNullOrWhiteSpace(candidate)) ?? string.Empty;

    private static string EnsureChatCompletionsEndpoint(string baseUrl) =>
        string.IsNullOrWhiteSpace(baseUrl)
            ? string.Empty
            : baseUrl.EndsWith("/chat/completions", StringComparison.OrdinalIgnoreCase)
                ? baseUrl
                : $"{baseUrl.TrimEnd('/')}/chat/completions";

    private sealed record CodingPlanModel(string Id, string Name, string BaseUrl, JsonObject GenerationConfig);
}
