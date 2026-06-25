namespace Kurisu.Tests.Compatibility;

public sealed class RuntimeProfileServiceTests
{
    [Fact]
    public void KurisuRuntimeProfileService_Inspect_ResolvesRuntimeOutputAndApprovalRules()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-runtime-{Guid.NewGuid():N}");
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
                Path.Combine(homeRoot, ".kurisu", "settings.json"),
                """
                {
                  "permissions": {
                    "allow": ["Bash(git *)"]
                  }
                }
                """);
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "settings.json"),
                """
                {
                  "advanced": {
                    "runtimeOutputDir": ".kurisu-runtime"
                  },
                  "checkpointing": true,
                  "chatCompression": {
                    "contextPercentageThreshold": 0.61
                  },
                  "permissions": {
                    "defaultMode": "auto-edit",
                    "confirmShellCommands": true,
                    "confirmFileEdits": false,
                    "allow": ["Bash(git *)", "Read", "Write"],
                    "ask": ["Edit"],
                    "deny": ["Read(.env)"]
                  },
                  "context": {
                    "fileName": ["TEAM.md", "KURISU.md"]
                  }
                }
                """);

            var service = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var profile = service.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            Assert.Equal(Path.Combine(workspaceRoot, ".kurisu-runtime"), profile.RuntimeBaseDirectory);
            Assert.Equal("project-settings", profile.RuntimeSource);
            Assert.Equal("auto-edit", profile.ApprovalProfile.DefaultMode);
            Assert.True(profile.ApprovalProfile.ConfirmShellCommands);
            Assert.False(profile.ApprovalProfile.ConfirmFileEdits);
            Assert.Contains("Bash(git *)", profile.ApprovalProfile.AllowRules);
            Assert.Contains("Read", profile.ApprovalProfile.AllowRules);
            Assert.Contains("Write", profile.ApprovalProfile.AllowRules);
            Assert.Contains("Edit", profile.ApprovalProfile.AskRules);
            Assert.Contains("Read(.env)", profile.ApprovalProfile.DenyRules);
            Assert.Equal(["TEAM.md", "KURISU.md"], profile.ContextFileNames);
            Assert.True(profile.Checkpointing);
            Assert.Equal(0.61d, profile.ChatCompression?.ContextPercentageThreshold);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void KurisuRuntimeProfileService_Inspect_DefaultsContextFilesToQwenAndAgents()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-runtime-default-context-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");

            Directory.CreateDirectory(workspaceRoot);
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu"));
            Directory.CreateDirectory(systemRoot);

            var service = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var profile = service.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            Assert.Equal(["KURISU.md", "AGENTS.md"], profile.ContextFileNames);
            Assert.Equal(
                [
                    Path.Combine(workspaceRoot, "KURISU.md"),
                    Path.Combine(workspaceRoot, "AGENTS.md")
                ],
                profile.ContextFilePaths);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void KurisuRuntimeProfileService_Inspect_ResolvesWorkspaceTrustFromTrustedFoldersFile()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-runtime-trust-{Guid.NewGuid():N}");
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

            var service = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var profile = service.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            Assert.True(profile.FolderTrustEnabled);
            Assert.False(profile.IsWorkspaceTrusted);
            Assert.Equal("file", profile.WorkspaceTrustSource);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void KurisuRuntimeProfileService_Inspect_DoesNotMergeProjectSettingsInUntrustedWorkspace()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-runtime-untrusted-settings-{Guid.NewGuid():N}");
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
                Path.Combine(homeRoot, ".kurisu", "settings.json"),
                """
                {
                  "security": {
                    "folderTrust": {
                      "enabled": true
                    }
                  },
                  "permissions": {
                    "defaultMode": "default"
                  },
                  "context": {
                    "fileName": ["KURISU.md", "AGENTS.md"]
                  }
                }
                """);
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "settings.json"),
                """
                {
                  "advanced": {
                    "runtimeOutputDir": ".kurisu-runtime"
                  },
                  "permissions": {
                    "defaultMode": "auto-edit"
                  },
                  "context": {
                    "fileName": ["TEAM.md"]
                  }
                }
                """);
            File.WriteAllText(
                Path.Combine(homeRoot, ".kurisu", "trustedFolders.json"),
                BuildTrustedFoldersJson(workspaceRoot, "DO_NOT_TRUST"));

            var service = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var profile = service.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            Assert.True(profile.FolderTrustEnabled);
            Assert.False(profile.IsWorkspaceTrusted);
            Assert.Equal("default", profile.ApprovalProfile.DefaultMode);
            Assert.DoesNotContain(".kurisu-runtime", profile.RuntimeBaseDirectory, StringComparison.OrdinalIgnoreCase);
            Assert.Equal(["KURISU.md", "AGENTS.md"], profile.ContextFileNames);
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
