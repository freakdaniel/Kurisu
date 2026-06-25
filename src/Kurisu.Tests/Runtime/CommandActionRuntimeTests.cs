namespace Kurisu.Tests.Runtime;

public sealed class CommandActionRuntimeTests
{
    [Fact]
    public async Task CommandActionRuntime_TryInvokeAsync_ExecutesMemoryCommands()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-command-actions-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");
            Directory.CreateDirectory(workspaceRoot);
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu"));
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(Path.Combine(workspaceRoot, "KURISU.md"), "# Project memory");
            File.WriteAllText(Path.Combine(homeRoot, ".kurisu", "KURISU.md"), "# Global memory");

            var runtimeProfileService = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var compatibilityService = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var toolRegistry = new ToolCatalogService(runtimeProfileService, new ApprovalPolicyService());
            var runtime = new CommandActionRuntime(
                new SlashCommandRuntime(compatibilityService),
                runtimeProfileService,
                compatibilityService,
                toolRegistry);

            var showResult = await runtime.TryInvokeAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                "/memory show",
                workspaceRoot);

            var addResult = await runtime.TryInvokeAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                "/memory add --project remember desktop port parity",
                workspaceRoot);

            var refreshResult = await runtime.TryInvokeAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                "/memory refresh",
                workspaceRoot);

            Assert.NotNull(showResult);
            Assert.Equal("completed", showResult!.Status);
            Assert.Contains("Project memory", showResult.Output);
            Assert.Contains("Global memory", showResult.Output);

            Assert.NotNull(addResult);
            Assert.Equal("completed", addResult!.Status);
            Assert.Contains("Saved memory", addResult.Output);
            Assert.Contains("remember desktop port parity", File.ReadAllText(Path.Combine(workspaceRoot, "KURISU.md")));

            Assert.NotNull(refreshResult);
            Assert.Equal("completed", refreshResult!.Status);
            Assert.Contains("Memory refreshed successfully", refreshResult.Output);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task CommandActionRuntime_TryInvokeAsync_ExecutesContextCommand()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-context-command-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "commands", "qc"));
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "skills", "project-review"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu"));
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(Path.Combine(workspaceRoot, "KURISU.md"), "# Project memory");
            File.WriteAllText(Path.Combine(homeRoot, ".kurisu", "KURISU.md"), "# Global memory");
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "commands", "qc", "code-review.md"),
                """
                ---
                description: Code review a pull request
                ---
                """
            );
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "skills", "project-review", "SKILL.md"),
                """
                ---
                name: project-review
                description: Review project changes with local context
                ---
                """
            );

            var compatibilityService = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var runtimeProfileService = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var runtime = new CommandActionRuntime(
                new SlashCommandRuntime(compatibilityService),
                runtimeProfileService,
                compatibilityService,
                new ToolCatalogService(runtimeProfileService, new ApprovalPolicyService()));

            var result = await runtime.TryInvokeAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                "/context detail",
                workspaceRoot);

            Assert.NotNull(result);
            Assert.Equal("completed", result!.Status);
            Assert.Equal("context", result.Command.Name);
            Assert.Contains("Workspace:", result.Output);
            Assert.Contains("Slash commands: 1", result.Output);
            Assert.Contains("Skills: 1", result.Output);
            Assert.Contains("qc/code-review", result.Output);
            Assert.Contains("project-review", result.Output);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }


}
