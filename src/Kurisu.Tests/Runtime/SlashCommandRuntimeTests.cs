namespace Kurisu.Tests.Runtime;

public sealed class SlashCommandRuntimeTests
{
    [Fact]
    public void SlashCommandRuntime_TryResolve_LoadsProjectCommandAndRendersArgs()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-command-runtime-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "commands", "qc"));
            Directory.CreateDirectory(homeRoot);
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "commands", "qc", "code-review.md"),
                """
                ---
                description: Code review a pull request
                ---

                Review PR {{args}} from {{cwd}} and summarize the risks.
                """
            );

            var runtime = new SlashCommandRuntime(new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)));
            var resolved = runtime.TryResolve(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                "/qc/code-review 123",
                workspaceRoot);

            Assert.NotNull(resolved);
            Assert.Equal("qc/code-review", resolved!.Name);
            Assert.Equal("project", resolved.Scope);
            Assert.Contains("123", resolved.ResolvedPrompt);
            Assert.Contains(workspaceRoot.Replace('\\', '/'), resolved.ResolvedPrompt);
            Assert.Contains("Code review a pull request", resolved.Description);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void SlashCommandRuntime_TryResolve_HidesProjectCommandInUntrustedWorkspace()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-command-runtime-untrusted-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "commands", "qc"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu"));
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
                Path.Combine(workspaceRoot, ".kurisu", "commands", "qc", "code-review.md"),
                """
                Review PR {{args}} from {{cwd}} and summarize the risks.
                """
            );

            var runtime = new SlashCommandRuntime(new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)));
            var resolved = runtime.TryResolve(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                "/qc/code-review 123",
                workspaceRoot);

            Assert.Null(resolved);
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
}
