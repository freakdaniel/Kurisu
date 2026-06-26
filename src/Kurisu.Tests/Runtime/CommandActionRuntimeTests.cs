using Kurisu.Core.Compatibility;
using Kurisu.Core.Models;
using Kurisu.Core.Runtime;
using Kurisu.Core.Runtime.Providers;
using Kurisu.Core.Sessions;
using Kurisu.Core.Tools;
using Kurisu.Tests.Shared.Fakes;

namespace Kurisu.Tests.Runtime;

public sealed class CommandActionRuntimeTests
{
    [Fact]
    public async Task CommandActionRuntime_LoadsProjectCommandAndRendersArgsAsync()
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
                """);

            var envPaths = new FakeDesktopEnvironmentPaths(homeRoot, systemRoot);
            var runtimeProfile = new KurisuRuntimeProfileService(envPaths, new RuntimeConfigService(envPaths), new RuntimeSelectionStore(envPaths, Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance));
            var compatibility = new KurisuCompatibilityService(envPaths);
            var toolRegistry = new ToolCatalogService(runtimeProfile, new AlwaysAllowApprovalPolicy());
            var runtime = new CommandActionRuntime(runtimeProfile, compatibility, toolRegistry);

            var result = await runtime.TryInvokeAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                "/qc/code-review 123",
                workspaceRoot);

            Assert.NotNull(result);
            Assert.Equal("resolved", result!.Status);
            Assert.Equal("qc/code-review", result.Command!.Name);
            Assert.Equal("project", result.Command.Scope);
            Assert.Contains("123", result.Command.ResolvedPrompt);
            Assert.Contains(workspaceRoot.Replace('\\', '/'), result.Command.ResolvedPrompt);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task CommandActionRuntime_HidesProjectCommandInUntrustedWorkspaceAsync()
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
                """);

            var envPaths = new FakeDesktopEnvironmentPaths(homeRoot, systemRoot);
            var runtimeProfile = new KurisuRuntimeProfileService(envPaths, new RuntimeConfigService(envPaths), new RuntimeSelectionStore(envPaths, Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance));
            var compatibility = new KurisuCompatibilityService(envPaths);
            var toolRegistry = new ToolCatalogService(runtimeProfile, new AlwaysAllowApprovalPolicy());
            var runtime = new CommandActionRuntime(runtimeProfile, compatibility, toolRegistry);

            var result = await runtime.TryInvokeAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                "/qc/code-review 123",
                workspaceRoot);

            Assert.Null(result);
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

    private sealed class AlwaysAllowApprovalPolicy : IApprovalPolicyEngine
    {
        public ApprovalDecision Evaluate(
            ApprovalCheckContext context,
            Kurisu.Core.Models.ApprovalProfile approvalProfile) =>
            new() { State = "allow", Reason = "Allowed for tests." };
    }
}
