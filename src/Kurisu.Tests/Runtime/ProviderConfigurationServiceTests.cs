using Kurisu.Core.Config;
using Kurisu.Core.Runtime.Providers;
using Microsoft.Extensions.Logging.Abstractions;

namespace Kurisu.Tests.Runtime;

/// <summary>
/// Multi-provider tests for the new <see cref="ProviderConfigurationService"/>.
/// Replaces the legacy single-auth <c>ProviderConfigurationResolver</c>.
/// </summary>
public sealed class ProviderConfigurationServiceTests
{
    [Fact]
    public void Resolve_UsesProviderIdOverride()
    {
        var ctx = NewContext();
        var resolved = ctx.Service.Resolve(NewRequest(ctx, providerId: "deepseek"));

        Assert.Equal("deepseek", resolved.ProviderId);
        Assert.Equal("deepseek", resolved.ProviderFlavor);
        Assert.Equal("https://api.deepseek.com/v1/chat/completions", resolved.Endpoint);
    }

    [Fact]
    public void Resolve_AddsOpenRouterHeadersWhenManifestMatches()
    {
        var ctx = NewContext();
        var resolved = ctx.Service.Resolve(NewRequest(ctx, providerId: "openrouter"));

        Assert.Equal("openrouter", resolved.ProviderFlavor);
        Assert.Contains("HTTP-Referer", resolved.Headers.Keys);
        Assert.Contains("X-Title", resolved.Headers.Keys);
        Assert.Equal("Kurisu", resolved.Headers["X-Title"]);
    }

    [Fact]
    public void Resolve_FallsBackToOpenAiWhenProviderIdUnknown()
    {
        var ctx = NewContext();
        var resolved = ctx.Service.Resolve(NewRequest(ctx, providerId: "totally-unknown-provider"));

        Assert.Equal("openai", resolved.ProviderId);
        Assert.Equal("https://api.openai.com/v1/chat/completions", resolved.Endpoint);
    }

    [Fact]
    public void Resolve_ReadsApiKeyFromProviderSettingsStore()
    {
        var ctx = NewContext();
        ctx.ProviderSettings.Configure("anthropic", "test-anthropic-key", baseUrl: null);
        var resolved = ctx.Service.Resolve(NewRequest(ctx, providerId: "anthropic"));

        Assert.Equal("test-anthropic-key", resolved.ApiKey);
        Assert.Equal("ANTHROPIC_API_KEY", resolved.ApiKeyEnvironmentVariable);
    }

    [Fact]
    public void Catalog_ContainsAllClineProviders()
    {
        var builtinIds = ProviderCatalog.Builtins.Select(m => m.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);

        Assert.Contains("anthropic", builtinIds);
        Assert.Contains("openai", builtinIds);
        Assert.Contains("bedrock", builtinIds);
        Assert.Contains("vertex", builtinIds);
        Assert.Contains("gemini", builtinIds);
        Assert.Contains("ollama", builtinIds);
        Assert.Contains("lmstudio", builtinIds);
        Assert.Contains("openrouter", builtinIds);
        Assert.Contains("deepseek", builtinIds);
        Assert.Contains("xai", builtinIds);
        Assert.Contains("groq", builtinIds);
        Assert.Contains("mistral", builtinIds);
        Assert.Contains("together", builtinIds);
        Assert.Contains("fireworks", builtinIds);
        Assert.Contains("moonshot", builtinIds);
        Assert.Contains("huggingface", builtinIds);
        Assert.Contains("vercel-ai-gateway", builtinIds);
        Assert.Contains("litellm", builtinIds);
        Assert.Contains("requesty", builtinIds);
        Assert.Contains("zai", builtinIds);
        Assert.Contains("cerebras", builtinIds);

        Assert.True(builtinIds.Count >= 40, $"Expected 40+ providers, got {builtinIds.Count}");
    }

    private readonly record struct TestContext(
        FakeDesktopEnvironmentPaths EnvPaths,
        ProviderSettingsStore ProviderSettings,
        ProviderConfigurationService Service);

    private static TestContext NewContext()
    {
        var envPaths = new FakeDesktopEnvironmentPaths(
            Path.Combine(Path.GetTempPath(), $"kurisu-pcs-{Guid.NewGuid():N}"),
            Path.Combine(Path.GetTempPath(), $"kurisu-pcs-sys-{Guid.NewGuid():N}"));
        var providerSettings = new ProviderSettingsStore(envPaths, NullLogger<ProviderSettingsStore>.Instance);
        var selectionStore = new RuntimeSelectionStore(envPaths, NullLogger<RuntimeSelectionStore>.Instance);
        var service = new ProviderConfigurationService(
            providerSettings,
            selectionStore,
            envPaths,
            Microsoft.Extensions.Options.Options.Create(new NativeAssistantRuntimeOptions()));
        return new TestContext(envPaths, providerSettings, service);
    }

    private static AssistantTurnRequest NewRequest(TestContext ctx, string providerId)
    {
        return new AssistantTurnRequest
        {
            SessionId = "test",
            Prompt = "test",
            WorkingDirectory = Path.GetTempPath(),
            TranscriptPath = Path.GetTempPath(),
            RuntimeProfile = new KurisuRuntimeProfileService(ctx.EnvPaths)
                .Inspect(new WorkspacePaths { WorkspaceRoot = Path.GetTempPath() }),
            ToolExecution = new NativeToolExecutionResult
            {
                ToolName = "noop",
                Status = "ok",
                ApprovalState = "not_required",
                WorkingDirectory = Path.GetTempPath(),
                ChangedFiles = Array.Empty<string>(),
            },
            ProviderIdOverride = providerId,
        };
    }
}