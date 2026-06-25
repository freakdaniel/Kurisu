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

// Multi-provider state: api keys in Providers.json + active selection in Selection.json.
            var homeKurisu = Path.Combine(homeRoot, ".kurisu");
            Directory.CreateDirectory(Path.Combine(homeKurisu, "State"));

            // Provider API keys + overrides live in Providers.json.
            File.WriteAllText(
                Path.Combine(homeKurisu, "State", "Providers.json"),
                """
                {
                  "entries": [
                    {
                      "manifestId": "openai",
                      "apiKey": "sk-test",
                      "baseUrl": "https://provider.example/v1"
                    }
                  ]
                }
                """);

            // Selection lives in Selection.json.
            File.WriteAllText(
                Path.Combine(homeKurisu, "State", "Selection.json"),
                """
                {
                  "selectedAuthType": "openai",
                  "selectedModelId": "qwen-max",
                  "selectedEmbeddingModelId": "text-embedding-v4"
                }
                """);

            var envPaths = new FakeDesktopEnvironmentPaths(homeRoot, systemRoot);
            var configService = new RuntimeConfigService(envPaths);
            var selectionStore = new RuntimeSelectionStore(envPaths, Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance);

            var registry = new ModelRegistryService(
                configService,
                selectionStore,
                new TokenLimitService(),
                Options.Create(new NativeAssistantRuntimeOptions()));
            var snapshot = registry.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            Assert.NotNull(snapshot.AvailableModels);
            Assert.NotNull(snapshot.DefaultModelId);
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
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu", "State"));
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(
                Path.Combine(homeRoot, ".kurisu", "State", "Selection.json"),
                """
                {
                  "selectedAuthType": "openai",
                  "selectedModelId": "qwen3-coder-plus",
                  "selectedEmbeddingModelId": "text-embedding-v4"
                }
                """);

            var configService = new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var selectionStore = new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance);
            var resolver = new ModelConfigResolver(
                new ModelRegistryService(
                    configService,
                    selectionStore,
                    new TokenLimitService(),
                    Options.Create(new NativeAssistantRuntimeOptions())));
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