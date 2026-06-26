using Kurisu.Core.Config;
using Kurisu.Core.Runtime.Providers;
using Kurisu.Core.Infrastructure.Constants;
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
        var resolved = ctx.Service.Resolve(NewRequest(ctx, providerId: ProviderIds.DeepSeek));

        Assert.Equal(ProviderIds.DeepSeek, resolved.ProviderId);
        Assert.Equal(ProviderIds.DeepSeek, resolved.ProviderFlavor);
        Assert.Equal("https://api.deepseek.com/v1/chat/completions", resolved.Endpoint);
    }

    [Fact]
    public void Resolve_AddsOpenRouterHeadersWhenManifestMatches()
    {
        var ctx = NewContext();
        var resolved = ctx.Service.Resolve(NewRequest(ctx, providerId: ProviderIds.OpenRouter));

        Assert.Equal(ProviderIds.OpenRouter, resolved.ProviderFlavor);
        Assert.Contains("HTTP-Referer", resolved.Headers.Keys);
        Assert.Contains("X-Title", resolved.Headers.Keys);
        Assert.Equal("Kurisu", resolved.Headers["X-Title"]);
    }

    [Fact]
    public void Resolve_FallsBackToOpenAiWhenProviderIdUnknown()
    {
        var ctx = NewContext();
        var resolved = ctx.Service.Resolve(NewRequest(ctx, providerId: "totally-unknown-provider"));

        Assert.Equal(ProviderIds.OpenAI, resolved.ProviderId);
        Assert.Equal("https://api.openai.com/v1/chat/completions", resolved.Endpoint);
    }

    [Fact]
    public void Resolve_ReadsApiKeyFromProviderSettingsStore()
    {
        var ctx = NewContext();
        ctx.ProviderSettings.Configure(ProviderIds.Anthropic, "test-anthropic-key", baseUrl: null);
        var resolved = ctx.Service.Resolve(NewRequest(ctx, providerId: ProviderIds.Anthropic));

        Assert.Equal("test-anthropic-key", resolved.ApiKey);
        Assert.Equal(ProviderEnvVars.Anthropic, resolved.ApiKeyEnvironmentVariable);
    }

    [Fact]
    public void Catalog_ContainsAllClineProviders()
    {
        var builtinIds = ProviderCatalog.Builtins.Select(m => m.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);

        Assert.Contains(ProviderIds.Anthropic, builtinIds);
        Assert.Contains(ProviderIds.OpenAI, builtinIds);
        Assert.Contains(ProviderIds.Bedrock, builtinIds);
        Assert.Contains(ProviderIds.Vertex, builtinIds);
        Assert.Contains(ProviderIds.Gemini, builtinIds);
        Assert.Contains(ProviderIds.Ollama, builtinIds);
        Assert.Contains(ProviderIds.LMStudio, builtinIds);
        Assert.Contains(ProviderIds.OpenRouter, builtinIds);
        Assert.Contains(ProviderIds.DeepSeek, builtinIds);
        Assert.Contains(ProviderIds.Xai, builtinIds);
        Assert.Contains(ProviderIds.Groq, builtinIds);
        Assert.Contains(ProviderIds.Mistral, builtinIds);
        Assert.Contains(ProviderIds.Together, builtinIds);
        Assert.Contains(ProviderIds.Fireworks, builtinIds);
        Assert.Contains(ProviderIds.Moonshot, builtinIds);
        Assert.Contains(ProviderIds.HuggingFace, builtinIds);
        Assert.Contains(ProviderIds.VercelAIGateway, builtinIds);
        Assert.Contains(ProviderIds.LiteLLM, builtinIds);
        Assert.Contains(ProviderIds.Requesty, builtinIds);
        Assert.Contains(ProviderIds.Zai, builtinIds);
        Assert.Contains(ProviderIds.Cerebras, builtinIds);

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
            RuntimeProfile = new KurisuRuntimeProfileService(ctx.EnvPaths, new RuntimeConfigService(ctx.EnvPaths), new RuntimeSelectionStore(ctx.EnvPaths, Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance))
                .Inspect(new WorkspacePaths { WorkspaceRoot = Path.GetTempPath() }),
            ToolExecution = new NativeToolExecutionResult
            {
                ToolName = "noop",
                Status = "ok",
                ApprovalState = "not_required",
                WorkingDirectory = Path.GetTempPath(),
                ChangedFiles = [],
            },
            ProviderIdOverride = providerId,
        };
    }
}