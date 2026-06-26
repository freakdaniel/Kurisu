using Kurisu.Core.Infrastructure.Constants;

namespace Kurisu.Tests.Agents;

public sealed class SubagentCatalogTests
{
    [Fact]
    public void SubagentCatalogService_ListAgents_IncludesBuiltinAndProjectAgents()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-agent-catalog-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "agents"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu", "agents"));
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "agents", "repo-research.md"),
                """
                ---
                name: repo-research
                description: Explore repository-level behavior
                tools:
                  - ReadFile
                  - Lsp
                ---

                You are a repository exploration specialist.
                """);

            var catalog = new SubagentCatalogService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance)),
                new SubagentValidationService(new SubagentModelSelectionService()));
            var agents = catalog.ListAgents(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            Assert.Contains(agents, agent => agent.Name == "general-purpose" && agent.IsBuiltin);
            Assert.Contains(agents, agent => agent.Name == "Explore" && agent.IsBuiltin);
            var projectAgent = Assert.Single(agents, agent => agent.Name == "repo-research");
            Assert.Equal("project", projectAgent.Scope);
            Assert.Contains("Lsp", projectAgent.Tools);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void SubagentCatalogService_ListAgents_ProjectScopeOverridesUserScope()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-agent-override-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "agents"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu", "agents"));
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(
                Path.Combine(homeRoot, ".kurisu", "agents", "custom.md"),
                """
                ---
                name: custom
                description: user version
                ---

                User agent
                """);
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "agents", "custom.md"),
                """
                ---
                name: custom
                description: project version
                ---

                Project agent
                """);

            var catalog = new SubagentCatalogService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance)),
                new SubagentValidationService(new SubagentModelSelectionService()));
            var agent = catalog.FindAgent(new WorkspacePaths { WorkspaceRoot = workspaceRoot }, ProviderIds.Custom);

            Assert.NotNull(agent);
            Assert.Equal("project", agent!.Scope);
            Assert.Equal("project version", agent.Description);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void SubagentCatalogService_ListAgents_HidesProjectAgentsInUntrustedWorkspace()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-agent-untrusted-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "agents"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu", "agents"));
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(
                Path.Combine(homeRoot, ".kurisu", "settings.json"),
                """
                {
                  "security": {
                    "folderTrust": {
                      "enabled": true
                    }
                  }
                }
                """);
            File.WriteAllText(
                Path.Combine(homeRoot, ".kurisu", "trustedFolders.json"),
                BuildTrustedFoldersJson(workspaceRoot, "DO_NOT_TRUST"));
            File.WriteAllText(
                Path.Combine(homeRoot, ".kurisu", "agents", "user-agent.md"),
                """
                ---
                name: user-agent
                description: user version
                ---

                User agent
                """);
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "agents", "project-agent.md"),
                """
                ---
                name: project-agent
                description: project version
                ---

                Project agent
                """);

            var catalog = new SubagentCatalogService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance)),
                new SubagentValidationService(new SubagentModelSelectionService()));
            var agents = catalog.ListAgents(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            Assert.Contains(agents, agent => agent.Name == "user-agent" && agent.Scope == "user");
            Assert.DoesNotContain(agents, agent => agent.Name == "project-agent");
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
    private static string BuildTrustedFoldersJson(string workspaceRoot, string trustValue) =>
        $$"""
        {
          "{{workspaceRoot.Replace("\\", "\\\\", StringComparison.Ordinal)}}": "{{trustValue}}"
        }
        """;

    [Fact]
    public void SubagentCatalogService_ListAgents_ParsesModelAndRunConfiguration()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-agent-model-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "agents"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu", "agents"));
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "agents", "planner.md"),
                """
                ---
                name: planner
                description: planning specialist
                model: kurisu-compatible:qwen3-coder-plus
                color: blue
                runConfig:
                  max_turns: 7
                  max_time_minutes: 12
                tools:
                  - read_file
                ---

                You plan carefully.
                """);

            var catalog = new SubagentCatalogService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance)),
                new SubagentValidationService(new SubagentModelSelectionService()));
            var planner = Assert.Single(catalog.ListAgents(new WorkspacePaths { WorkspaceRoot = workspaceRoot }), item => item.Name == "planner");

            Assert.Equal("kurisu-compatible:qwen3-coder-plus", planner.Model);
            Assert.Equal("blue", planner.Color);
            Assert.Equal(7, planner.RunConfiguration.MaxTurns);
            Assert.Equal(12, planner.RunConfiguration.MaxTimeMinutes);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
