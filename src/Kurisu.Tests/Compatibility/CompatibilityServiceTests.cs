namespace Kurisu.Tests.Compatibility;

public sealed class CompatibilityServiceTests
{
    [Fact]
    public void KurisuCompatibilityService_Inspect_ReturnsProjectAndUserLayers()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-compat-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");

            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "commands"));
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "skills"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu", "skills"));
            Directory.CreateDirectory(systemRoot);

            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "settings.json"),
                """{ "general": {}, "ui": {} }""");
            File.WriteAllText(
                Path.Combine(homeRoot, ".kurisu", "settings.json"),
                """{ "privacy": {} }""");
            File.WriteAllText(Path.Combine(workspaceRoot, "KURISU.md"), "# project memory");

            var previousDefaults = Environment.GetEnvironmentVariable("KURISU_SYSTEM_DEFAULTS_PATH");
            var previousSettings = Environment.GetEnvironmentVariable("KURISU_SYSTEM_SETTINGS_PATH");

            try
            {
                Environment.SetEnvironmentVariable(
                    "KURISU_SYSTEM_DEFAULTS_PATH",
                    Path.Combine(systemRoot, "system-defaults.json"));
                Environment.SetEnvironmentVariable(
                    "KURISU_SYSTEM_SETTINGS_PATH",
                    Path.Combine(systemRoot, "settings.json"));

                var service = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
                var snapshot = service.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

                Assert.Equal("KURISU.md", snapshot.DefaultContextFileName);
                Assert.Contains(snapshot.SettingsLayers, layer => layer.Id == "project-settings" && layer.Exists);
                Assert.Contains(snapshot.SettingsLayers, layer => layer.Id == "user-settings" && layer.Exists);
                Assert.Contains(snapshot.SurfaceDirectories, surface => surface.Id == "project-commands" && surface.Exists);
                Assert.Contains(snapshot.SurfaceDirectories, surface => surface.Id == "context-root" && surface.Exists);
            }
            finally
            {
                Environment.SetEnvironmentVariable("KURISU_SYSTEM_DEFAULTS_PATH", previousDefaults);
                Environment.SetEnvironmentVariable("KURISU_SYSTEM_SETTINGS_PATH", previousSettings);
            }
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void KurisuCompatibilityService_Inspect_HidesProjectCommandsAndSkillsInUntrustedWorkspace()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-compat-untrusted-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");

            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "commands"));
            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu", "skills", "project-skill"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu", "commands"));
            Directory.CreateDirectory(Path.Combine(homeRoot, ".kurisu", "skills", "user-skill"));
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
                Path.Combine(workspaceRoot, ".kurisu", "commands", "project-command.md"),
                "# project command");
            File.WriteAllText(
                Path.Combine(homeRoot, ".kurisu", "commands", "user-command.md"),
                "# user command");
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "skills", "project-skill", "SKILL.md"),
                "# project skill");
            File.WriteAllText(
                Path.Combine(homeRoot, ".kurisu", "skills", "user-skill", "SKILL.md"),
                "# user skill");

            var service = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var snapshot = service.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot });

            Assert.DoesNotContain(snapshot.Commands, command => command.Scope == "project");
            Assert.DoesNotContain(snapshot.Skills, skill => skill.Scope == "project");
            Assert.Contains(snapshot.Commands, command => command.Scope == "user");
            Assert.Contains(snapshot.Skills, skill => skill.Scope == "user");
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
