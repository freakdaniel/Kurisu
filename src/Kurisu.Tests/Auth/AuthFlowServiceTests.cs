using Kurisu.Core.Auth;

namespace Kurisu.Tests.Auth;

public sealed class AuthFlowServiceTests
{
    [Fact]
    public async Task ConfigureCodingPlanAsync_WritesCodingPlanTemplateAndStatus()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-auth-coding-plan-{Guid.NewGuid():N}");
        var workspaceRoot = Path.Combine(root, "workspace");
        var homeRoot = Path.Combine(root, "home");
        var systemRoot = Path.Combine(root, "system");
        Directory.CreateDirectory(workspaceRoot);
        Directory.CreateDirectory(homeRoot);
        Directory.CreateDirectory(systemRoot);

        try
        {
            var environmentPaths = new FakeDesktopEnvironmentPaths(homeRoot, systemRoot, workspaceRoot);
            var runtimeProfileService = new KurisuRuntimeProfileService(environmentPaths);
            var service = new AuthFlowService(runtimeProfileService, environmentPaths);

            var snapshot = await service.ConfigureCodingPlanAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new ConfigureCodingPlanAuthRequest
                {
                    Scope = "project",
                    Region = "global",
                    ApiKey = "coding-plan-key",
                    Model = "qwen3-coder-next"
                });

            Assert.Equal("openai", snapshot.SelectedType);
            Assert.Equal("connected", snapshot.Status);
            Assert.Equal("qwen3-coder-next", snapshot.Model);
            Assert.Equal("BAILIAN_CODING_PLAN_API_KEY", snapshot.ApiKeyEnvironmentVariable);

            var settingsPath = Path.Combine(workspaceRoot, ".kurisu", "settings.json");
            var settings = await File.ReadAllTextAsync(settingsPath);
            Assert.Contains("\"BAILIAN_CODING_PLAN_API_KEY\": \"coding-plan-key\"", settings);
            Assert.Contains("\"region\": \"global\"", settings);
            Assert.Contains("\"qwen3-coder-plus\"", settings);
        }
        finally
        {
            if (Directory.Exists(root))
            {
                Directory.Delete(root, recursive: true);
            }
        }
    }

    [Theory]
    [InlineData("openrouter", "OpenRouter", "OPENROUTER_API_KEY", "https://openrouter.ai/api/v1/chat/completions")]
    [InlineData("deepseek", "DeepSeek", "DEEPSEEK_API_KEY", "https://api.deepseek.com/v1/chat/completions")]
    [InlineData("modelscope", "ModelScope", "MODELSCOPE_API_KEY", "https://api.modelscope.cn/v1/chat/completions")]
    public void GetStatus_UsesProviderAliasMetadata(
        string authType,
        string displayName,
        string envKey,
        string endpoint)
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-auth-provider-alias-{authType}-{Guid.NewGuid():N}");
        var workspaceRoot = Path.Combine(root, "workspace");
        var homeRoot = Path.Combine(root, "home");
        var systemRoot = Path.Combine(root, "system");
        Directory.CreateDirectory(workspaceRoot);
        Directory.CreateDirectory(homeRoot);
        Directory.CreateDirectory(systemRoot);

        try
        {
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu"));
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "settings.json"),
                $$"""
                {
                  "security": {
                    "auth": {
                      "selectedType": "{{authType}}"
                    }
                  },
                  "model": {
                    "name": "provider-model"
                  }
                }
                """);
            Environment.SetEnvironmentVariable(envKey, "provider-key");

            var environmentPaths = new FakeDesktopEnvironmentPaths(homeRoot, systemRoot, workspaceRoot);
            var runtimeProfileService = new KurisuRuntimeProfileService(environmentPaths);
            var service = new AuthFlowService(runtimeProfileService, environmentPaths);

            var snapshot = service.GetStatus(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            Assert.Equal(authType, snapshot.SelectedType);
            Assert.Equal(displayName, snapshot.DisplayName);
            Assert.Equal(envKey, snapshot.ApiKeyEnvironmentVariable);
            Assert.Equal(endpoint, snapshot.Endpoint);
            Assert.True(snapshot.HasApiKey);
        }
        finally
        {
            Environment.SetEnvironmentVariable(envKey, null);
            if (Directory.Exists(root))
            {
                Directory.Delete(root, recursive: true);
            }
        }
    }

    [Fact]
    public async Task ConfigureOpenAiCompatibleAsync_PresetIdAutofillsBaseUrlAndEnvVar()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-auth-preset-{Guid.NewGuid():N}");
        var workspaceRoot = Path.Combine(root, "workspace");
        var homeRoot = Path.Combine(root, "home");
        var systemRoot = Path.Combine(root, "system");
        Directory.CreateDirectory(workspaceRoot);
        Directory.CreateDirectory(homeRoot);
        Directory.CreateDirectory(systemRoot);

        try
        {
            var environmentPaths = new FakeDesktopEnvironmentPaths(homeRoot, systemRoot, workspaceRoot);
            var runtimeProfileService = new KurisuRuntimeProfileService(environmentPaths);
            var service = new AuthFlowService(runtimeProfileService, environmentPaths);

            var snapshot = await service.ConfigureOpenAiCompatibleAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new ConfigureOpenAiCompatibleAuthRequest
                {
                    Scope = "user",
                    AuthType = string.Empty,    // preset overrides
                    PresetId = "deepseek",
                    BaseUrl = string.Empty,     // preset fills
                    Model = string.Empty,       // preset fills (null in preset => empty)
                    ApiKey = "sk-deepseek",
                    ApiKeyEnvironmentVariable = string.Empty  // preset fills
                });

            var settingsPath = Path.Combine(homeRoot, ".kurisu", "settings.json");
            var settings = await File.ReadAllTextAsync(settingsPath);
            Assert.Contains("\"selectedType\": \"deepseek\"", settings);
            Assert.Contains("\"baseUrl\": \"https://api.deepseek.com/v1\"", settings);
            Assert.Contains("\"DEEPSEEK_API_KEY\": \"sk-deepseek\"", settings);
            Assert.Equal("connected", snapshot.Status);
        }
        finally
        {
            if (Directory.Exists(root))
            {
                Directory.Delete(root, recursive: true);
            }
        }
    }
}
