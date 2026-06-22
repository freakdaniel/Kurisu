using System.Text.Json;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Models;
using Kurisu.Core.Runtime.Providers;
using Kurisu.Tests.Shared.Fakes;

namespace Kurisu.Tests.Runtime;

public sealed class ProviderPresetCatalogTests
{
    [Fact]
    public void Presets_ContainsExpectedCount()
    {
        Assert.Equal(17, ProviderPresetCatalog.Presets.Count);
    }

    [Fact]
    public void Presets_AllIdsAreUnique()
    {
        var ids = ProviderPresetCatalog.Presets.Select(p => p.Id).ToList();
        Assert.Equal(ids.Count, ids.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    [Fact]
    public void Presets_OpenAiIsDefault()
    {
        var openai = ProviderPresetCatalog.FindById("openai");
        Assert.NotNull(openai);
        Assert.Equal("OpenAI", openai!.Name);
        Assert.Equal(100, openai.Popularity);
    }

    [Fact]
    public void Presets_PopularityIsNonNegative()
    {
        foreach (var preset in ProviderPresetCatalog.Presets)
        {
            Assert.True(preset.Popularity >= 0, $"Preset {preset.Id} has negative popularity {preset.Popularity}");
        }
    }

    [Fact]
    public void Presets_AllBaseUrlsParse()
    {
        foreach (var preset in ProviderPresetCatalog.Presets)
        {
            if (string.IsNullOrWhiteSpace(preset.DefaultBaseUrl)) continue;
            Assert.True(Uri.TryCreate(preset.DefaultBaseUrl, UriKind.Absolute, out _),
                $"Preset {preset.Id} has invalid DefaultBaseUrl '{preset.DefaultBaseUrl}'");
        }
    }

    [Fact]
    public void Presets_AllApiKeyEnvVarsAreUpperSnakeCase()
    {
        foreach (var preset in ProviderPresetCatalog.Presets)
        {
            foreach (var envVar in preset.ApiKeyEnvVars)
            {
                Assert.Equal(envVar.ToUpperInvariant(), envVar);
            }
        }
    }

    [Fact]
    public void FindById_IsCaseInsensitive()
    {
        var found1 = ProviderPresetCatalog.FindById("OpenAI");
        var found2 = ProviderPresetCatalog.FindById("openai");
        Assert.NotNull(found1);
        Assert.Same(found1, found2);
    }
}

public sealed class ProviderModelListerTests
{
    [Fact]
    public async Task ListAsync_AnthropicPreset_ReturnsHardcodedFallback()
    {
        var lister = new ProviderModelLister(new FakeDesktopEnvironmentPaths(Path.GetTempPath(), null));
        var preset = ProviderPresetCatalog.FindById("anthropic")!;

        var result = await lister.ListAsync(preset, apiKey: "irrelevant");

        Assert.Contains("claude-3-5-sonnet-latest", result.Models);
        Assert.Contains("claude-sonnet-4", result.Models);
        Assert.False(result.FromCache);
        Assert.Contains("fallback", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ListAsync_CustomPreset_ReturnsEmpty()
    {
        var lister = new ProviderModelLister(new FakeDesktopEnvironmentPaths(Path.GetTempPath(), null));
        var preset = ProviderPresetCatalog.FindById("custom")!;

        var result = await lister.ListAsync(preset, apiKey: null);

        Assert.Empty(result.Models);
        Assert.Contains("Custom", result.Error);
    }

    [Fact]
    public async Task ListAsync_ParsesOpenAiShapeResponse()
    {
        var handler = new RecordingHttpMessageHandler((_, _) =>
        {
            var body = """
                {
                  "data": [
                    {"id": "gpt-4o"},
                    {"id": "gpt-4o-mini"},
                    {"id": "o1"}
                  ]
                }
                """;
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json")
            });
        });
        var lister = new ProviderModelLister(new FakeDesktopEnvironmentPaths(Path.GetTempPath(), null), new HttpClient(handler));
        var preset = ProviderPresetCatalog.FindById("openai")!;

        var result = await lister.ListAsync(preset, apiKey: "sk-test", forceRefresh: true);

        Assert.Equal(new[] { "gpt-4o", "gpt-4o-mini", "o1" }, result.Models);
        Assert.Empty(result.Error);
    }

    [Fact]
    public async Task ListAsync_ParsesOllamaShapeResponse()
    {
        var handler = new RecordingHttpMessageHandler((_, _) =>
        {
            var body = """
                {
                  "models": [
                    {"name": "llama3:8b"},
                    {"name": "mistral:7b"}
                  ]
                }
                """;
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json")
            });
        });
        var lister = new ProviderModelLister(new FakeDesktopEnvironmentPaths(Path.GetTempPath(), null), new HttpClient(handler));
        var preset = ProviderPresetCatalog.FindById("ollama")!;

        var result = await lister.ListAsync(preset, apiKey: null, forceRefresh: true);

        Assert.Equal(new[] { "llama3:8b", "mistral:7b" }, result.Models);
    }

    [Fact]
    public async Task ListAsync_Unauthorized_ReturnsEmptyWithError()
    {
        var handler = new RecordingHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.Unauthorized)
            {
                Content = new StringContent("{\"error\":\"invalid api key\"}")
            }));
        var lister = new ProviderModelLister(new FakeDesktopEnvironmentPaths(Path.GetTempPath(), null), new HttpClient(handler));
        var preset = ProviderPresetCatalog.FindById("openai")!;

        var result = await lister.ListAsync(preset, apiKey: "bad", forceRefresh: true);

        Assert.Empty(result.Models);
        Assert.Contains("401", result.Error);
    }

    [Fact]
    public async Task ListAsync_CachesResultAndReusesOnSecondCall()
    {
        var homeDir = Path.Combine(Path.GetTempPath(), $"kurisu-lister-{Guid.NewGuid():N}");
        Directory.CreateDirectory(homeDir);
        try
        {
            var callCount = 0;
            var handler = new RecordingHttpMessageHandler((_, _) =>
            {
                callCount++;
                var body = """{"data":[{"id":"gpt-4o"}]}""";
                return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
                {
                    Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json")
                });
            });
            var lister = new ProviderModelLister(new FakeDesktopEnvironmentPaths(homeDir, null), new HttpClient(handler));
            var preset = ProviderPresetCatalog.FindById("openai")!;

            var first = await lister.ListAsync(preset, apiKey: "sk-test", forceRefresh: true);
            var second = await lister.ListAsync(preset, apiKey: "sk-test", forceRefresh: false);

            Assert.Equal(1, callCount);
            Assert.False(first.FromCache);
            Assert.True(second.FromCache);
        }
        finally
        {
            try { Directory.Delete(homeDir, recursive: true); } catch { /* best-effort */ }
        }
    }
}


