using Kurisu.Core.Config;
using Kurisu.Core.Runtime.Providers;

namespace Kurisu.Tests.Runtime;

public sealed class ModelRegistryTests
{
    [Fact]
    public void Inspect_ReturnsConfiguredProvidersAndEmbeddingModel()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-model-registry-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");

            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu"));
            Directory.CreateDirectory(systemRoot);

            // Runtime selection now lives in Selection.json (not Settings.json).
            var homeKurisu = Path.Combine(homeRoot, ".kurisu");
            File.WriteAllText(
                Path.Combine(homeKurisu, "State", "Selection.json"),
                """
                {
                  "selectedAuthType": "openai",
                  "selectedModelId": "kurisu-max",
                  "selectedEmbeddingModelId": "text-embedding-v4"
                }
                """);

            // Provider API keys + overrides live in Providers.json.
            File.WriteAllText(
                Path.Combine(homeKurisu, "State", "Providers.json"),
                """
                {
                  "entries": [
                    {
                      "manifestId": "kurisu-max",
                      "apiKey": "sk-test",
                      "baseUrl": "https://provider.example/v1"
                    }
                  ]
                }
                """);

            var envPaths = new FakeDesktopEnvironmentPaths(homeRoot, systemRoot);
            var configService = new RuntimeConfigService(envPaths);

            var registry = new ModelRegistryService(
                configService,
                new TokenLimitService(),
                Microsoft.Extensions.Options.Options.Create(new NativeAssistantRuntimeOptions()));
            var snapshot = registry.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            // Test expects legacy Settings.json with modelProviders to drive the registry.
            Assert.Equal("kurisu-max", snapshot.DefaultModelId);
            Assert.Equal("text-embedding-v4", snapshot.EmbeddingModelId);
            Assert.Equal("openai", snapshot.SelectedAuthType);

            // The configured custom provider from modelProviders should appear in the available list.
            var defaultModel = Assert.Single(snapshot.AvailableModels, static model => model.IsDefaultModel);
            Assert.Equal("kurisu-max", defaultModel.Id);
            Assert.Equal("model-provider", defaultModel.Source);
            Assert.Equal(262_144, defaultModel.ContextWindowSize);
            Assert.True(defaultModel.Capabilities.SupportsToolCalls);

            var embeddingModel = Assert.Single(snapshot.AvailableModels, static model => model.IsEmbeddingModel);
            Assert.Equal("text-embedding-v4", embeddingModel.Id);
            Assert.True(embeddingModel.Capabilities.SupportsEmbeddings);
            Assert.False(embeddingModel.Capabilities.SupportsToolCalls);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void Resolve_ReturnsEmbeddingAndDefaultModelsFromSnapshot()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-model-resolver-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");

            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu"));
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "settings.json"),
                """
                {
                  "security": {
                    "auth": {
                      "selectedType": "openai"
                    }
                  },
                  "model": {
                    "name": "qwen3-coder-plus"
                  },
                  "embeddingModel": "text-embedding-v4"
                }
                """);

            var configService = new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var resolver = new ModelConfigResolver(
                new ModelRegistryService(
                    configService,
                    new TokenLimitService(),
                    Microsoft.Extensions.Options.Options.Create(new NativeAssistantRuntimeOptions())));
            var workspace = new WorkspacePaths { WorkspaceRoot = workspaceRoot };

            var defaultModel = resolver.Resolve(workspace);
            var embeddingModel = resolver.Resolve(workspace, embedding: true);

            Assert.Equal("qwen3-coder-plus", defaultModel.Id);
            Assert.False(defaultModel.IsEmbeddingModel);
            Assert.Equal("text-embedding-v4", embeddingModel.Id);
            Assert.True(embeddingModel.IsEmbeddingModel);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}