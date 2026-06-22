using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Kurisu.Core.Telemetry;

namespace Kurisu.Tests.Telemetry;

public sealed class TelemetryServiceTests
{
    [Fact]
    public async Task TelemetryService_TrackUserPromptAsync_RedactsPromptContentWhenPromptLoggingDisabled()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-telemetry-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var runtimeProfile = CreateRuntimeProfile(root, logPrompts: false);
            var telemetry = new TelemetryService(NullLogger<TelemetryService>.Instance);

            await telemetry.TrackUserPromptAsync(runtimeProfile, "session-1", "prompt-1", "very secret prompt", "openai");

            var snapshot = await telemetry.GetSnapshotAsync(runtimeProfile);
            var content = await File.ReadAllTextAsync(snapshot.EventsPath);

            Assert.Equal(1, snapshot.EventCount);
            Assert.Contains("\"event.name\":\"user_prompt\"", content);
            Assert.DoesNotContain("very secret prompt", content);
            Assert.Contains("[redacted]", content);
            Assert.True(snapshot.Metrics.ContainsKey("kurisu.prompt.count"));
            Assert.True(snapshot.Metrics.ContainsKey("prompt.count"));
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task NativeToolHostService_ExecuteAsync_EmitsTelemetryForToolExecution()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-telemetry-tool-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");

            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu"));
            Directory.CreateDirectory(homeRoot);
            Directory.CreateDirectory(systemRoot);
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "settings.json"),
                """
                {
                  "permissions": {
                    "defaultMode": "default",
                    "allow": ["Read"]
                  },
                  "telemetry": {
                    "enabled": true,
                    "outfile": "telemetry/events.jsonl"
                  }
                }
                """);

            var environmentPaths = new FakeDesktopEnvironmentPaths(homeRoot, systemRoot);
            var runtimeProfileService = new KurisuRuntimeProfileService(environmentPaths);
            var telemetry = new TelemetryService(NullLogger<TelemetryService>.Instance);
            var host = new NativeToolHostService(
                runtimeProfileService,
                new ApprovalPolicyService(),
                telemetryService: telemetry);
            var targetFile = Path.Combine(workspaceRoot, "notes.txt");
            File.WriteAllText(targetFile, "telemetry content");

            var result = await host.ExecuteAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new ExecuteNativeToolRequest
                {
                    ToolName = "read_file",
                    ArgumentsJson = $$"""{"session_id":"session-tool","file_path":"{{targetFile.Replace("\\", "\\\\")}}"}"""
                });

            var snapshot = await telemetry.GetSnapshotAsync(runtimeProfileService.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot }));
            var content = await File.ReadAllTextAsync(snapshot.EventsPath);

            Assert.Equal("completed", result.Status);
            Assert.Contains("\"event.name\":\"tool_call\"", content);
            Assert.Contains("\"function_name\":\"read_file\"", content);
            Assert.True(snapshot.Metrics.ContainsKey("kurisu.tool.call.count"));
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task DesktopSessionHostService_StartTurnAsync_EmitsSessionAndPromptTelemetry()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-telemetry-session-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");

            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu"));
            Directory.CreateDirectory(homeRoot);
            Directory.CreateDirectory(systemRoot);
            File.WriteAllText(
                Path.Combine(workspaceRoot, ".kurisu", "settings.json"),
                """
                {
                  "telemetry": {
                    "enabled": true,
                    "outfile": "telemetry/events.jsonl"
                  }
                }
                """);

            var environmentPaths = new FakeDesktopEnvironmentPaths(homeRoot, systemRoot);
            var runtimeProfileService = new KurisuRuntimeProfileService(environmentPaths);
            var compatibilityService = new KurisuCompatibilityService(environmentPaths);
            var telemetry = new TelemetryService(NullLogger<TelemetryService>.Instance);
            var sessionHost = TestServiceFactory.CreateSessionHost(
                runtimeProfileService,
                compatibilityService,
                telemetryService: telemetry);

            await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Telemetry should record this turn",
                    WorkingDirectory = workspaceRoot
                });

            var snapshot = await telemetry.GetSnapshotAsync(runtimeProfileService.Inspect(new WorkspacePaths { WorkspaceRoot = workspaceRoot }));
            var content = await File.ReadAllTextAsync(snapshot.EventsPath);

            Assert.Contains("\"event.name\":\"cli_config\"", content);
            Assert.Contains("\"event.name\":\"user_prompt\"", content);
            Assert.True(snapshot.Metrics.ContainsKey("kurisu.session.count"));
            Assert.True(snapshot.Metrics.ContainsKey("session.count"));
            Assert.True(snapshot.Metrics.ContainsKey("kurisu.prompt.count"));
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static KurisuRuntimeProfile CreateRuntimeProfile(string root, bool logPrompts)
    {
        var workspaceRoot = Path.Combine(root, "workspace");
        var homeRoot = Path.Combine(root, "home");
        var systemRoot = Path.Combine(root, "system");
        Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu"));
        Directory.CreateDirectory(homeRoot);
        Directory.CreateDirectory(systemRoot);

        return new KurisuRuntimeProfile
        {
            ProjectRoot = workspaceRoot,
            GlobalKurisuDirectory = Path.Combine(homeRoot, ".kurisu"),
            RuntimeBaseDirectory = Path.Combine(homeRoot, ".kurisu"),
            RuntimeSource = "test",
            ProjectDataDirectory = Path.Combine(homeRoot, ".kurisu", "projects", "test"),
            ChatsDirectory = Path.Combine(homeRoot, ".kurisu", "projects", "test", "chats"),
            HistoryDirectory = Path.Combine(homeRoot, ".kurisu", "history", "test"),
            ContextFileNames = ["KURISU.md"],
            ContextFilePaths = [Path.Combine(workspaceRoot, "KURISU.md")],
            Telemetry = new RuntimeTelemetrySettings
            {
                Enabled = true,
                Outfile = "telemetry/events.jsonl",
                LogPrompts = logPrompts
            },
            ApprovalProfile = new ApprovalProfile
            {
                DefaultMode = "default",
                ConfirmShellCommands = true,
                ConfirmFileEdits = true,
                AllowRules = [],
                AskRules = [],
                DenyRules = []
            }
        };
    }
}

