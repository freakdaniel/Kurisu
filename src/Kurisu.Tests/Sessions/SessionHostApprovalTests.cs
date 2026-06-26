using Kurisu.Core.Infrastructure.Constants;

namespace Kurisu.Tests.Sessions;

public sealed class SessionHostApprovalTests
{
    [Fact]
    public async Task DesktopSessionHostService_ApprovePendingToolAsync_ExecutesStoredToolAndResolvesPendingEntry()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-approve-pending-tool-{Guid.NewGuid():N}");
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
                    "ask": ["Edit"]
                  }
                }
                """);

            var runtimeProfileService = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance));
            var compatibilityService = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var sessionCatalog = new DesktopSessionCatalogService(runtimeProfileService, new ChatRecordingService());
            var sessionHost = CreateSessionHost(runtimeProfileService, compatibilityService, sessionCatalog);

            var targetFile = Path.Combine(workspaceRoot, "notes.txt");
            var startResult = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Queue a pending edit for approval.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.WriteFile,
                    ToolArgumentsJson = $$"""{"file_path":"{{targetFile.Replace("\\", "\\\\")}}","content":"approved write"}""",
                    ApproveToolExecution = false
                });

            var pendingDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = startResult.Session.SessionId
                });
            Assert.NotNull(pendingDetail);
            var pendingToolEntries = pendingDetail!.Entries.Where(entry => entry.Type == "tool").ToArray();
            var pendingToolEntry = Assert.Single(pendingToolEntries);

            var approvalResult = await sessionHost.ApprovePendingToolAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new ApproveDesktopSessionToolRequest
                {
                    SessionId = startResult.Session.SessionId,
                    EntryId = pendingToolEntry.Id
                });

            Assert.Equal("completed", approvalResult.ToolExecution.Status);
            Assert.Equal(WellKnownToolNames.WriteFile, approvalResult.ToolExecution.ToolName);
            Assert.Equal("approved write", File.ReadAllText(targetFile));

            var finalDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = startResult.Session.SessionId
                });
            Assert.NotNull(finalDetail);
            Assert.Equal(0, finalDetail!.Summary.PendingApprovalCount);
            Assert.Equal(1, finalDetail.Summary.CompletedToolCount);

            var resolvedPendingEntry = finalDetail.Entries.First(entry => entry.Id == pendingToolEntry.Id);
            Assert.Equal("approved", resolvedPendingEntry.ResolutionStatus);
            Assert.False(string.IsNullOrWhiteSpace(resolvedPendingEntry.ResolvedAt));

            var completedExecutionEntry = finalDetail.Entries.Last(entry =>
                entry.Type == "tool" &&
                entry.ToolName == WellKnownToolNames.WriteFile);
            Assert.Equal("completed", completedExecutionEntry.Status);
            Assert.Contains("approved write", completedExecutionEntry.Arguments);
            Assert.Equal("executed-after-approval", completedExecutionEntry.ResolutionStatus);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task DesktopSessionHostService_ApprovePendingToolAsync_EmitsLifecycleEvents()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-approve-events-{Guid.NewGuid():N}");
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
                    "ask": ["Edit"]
                  }
                }
                """);

            var runtimeProfileService = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance));
            var compatibilityService = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var sessionCatalog = new DesktopSessionCatalogService(runtimeProfileService, new ChatRecordingService());
            var sessionHost = CreateSessionHost(runtimeProfileService, compatibilityService, sessionCatalog);

            var targetFile = Path.Combine(workspaceRoot, "notes.txt");
            var startResult = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Queue a pending edit for event emission.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.WriteFile,
                    ToolArgumentsJson = $$"""{"file_path":"{{targetFile.Replace("\\", "\\\\")}}","content":"approved write"}""",
                    ApproveToolExecution = false
                });

            var pendingDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = startResult.Session.SessionId
                });
            Assert.NotNull(pendingDetail);
            var pendingToolEntry = pendingDetail!.Entries.Last(entry =>
                entry.Type == "tool" &&
                entry.ToolName == WellKnownToolNames.WriteFile &&
                entry.Status == ToolExecutionStatus.ApprovalRequired);

            var emittedEvents = new List<DesktopSessionEvent>();
            sessionHost.SessionEvent += (_, sessionEvent) => emittedEvents.Add(sessionEvent);

            await sessionHost.ApprovePendingToolAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new ApproveDesktopSessionToolRequest
                {
                    SessionId = startResult.Session.SessionId,
                    EntryId = pendingToolEntry.Id
                });

            Assert.Collection(
                emittedEvents.Select(item => item.Kind),
                kind => Assert.Equal(DesktopSessionEventKind.ToolApproved, kind),
                kind => Assert.Equal(DesktopSessionEventKind.ToolCompleted, kind),
                kind => Assert.Equal(DesktopSessionEventKind.AssistantPreparingContext, kind),
                kind => Assert.Equal(DesktopSessionEventKind.AssistantGenerating, kind),
                kind => Assert.Equal(DesktopSessionEventKind.AssistantCompleted, kind),
                kind => Assert.Equal(DesktopSessionEventKind.TurnCompleted, kind));

            Assert.All(emittedEvents, item => Assert.Equal(startResult.Session.SessionId, item.SessionId));
            Assert.Contains(emittedEvents, item => item.ToolName == WellKnownToolNames.WriteFile);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task DesktopSessionHostService_AnswerPendingQuestionAsync_StoresAnswersAndResolvesPendingEntry()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-answer-question-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        try
        {
            var workspaceRoot = Path.Combine(root, "workspace");
            var homeRoot = Path.Combine(root, "home");
            var systemRoot = Path.Combine(root, "system");

            Directory.CreateDirectory(Path.Combine(workspaceRoot, ".kurisu"));
            Directory.CreateDirectory(homeRoot);
            Directory.CreateDirectory(systemRoot);

            var runtimeProfileService = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance));
            var compatibilityService = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var sessionCatalog = new DesktopSessionCatalogService(runtimeProfileService, new ChatRecordingService());
            var sessionHost = CreateSessionHost(runtimeProfileService, compatibilityService, sessionCatalog);

            var startResult = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Ask the user which implementation path to take.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.AskUserQuestion,
                    ToolArgumentsJson =
                        """
                        {
                          "questions": [
                            {
                              "header": "Direction",
                              "question": "Which implementation path should we take?",
                              "multiSelect": false,
                              "options": [
                                { "label": "Native host", "description": "Continue deepening the C# runtime." },
                                { "label": "UI polish", "description": "Pause runtime work and improve the renderer." }
                              ]
                            }
                          ]
                        }
                        """,
                    ApproveToolExecution = false
                });

            var pendingDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = startResult.Session.SessionId
                });
            Assert.NotNull(pendingDetail);
            Assert.Equal(1, pendingDetail!.Summary.PendingQuestionCount);

            var pendingEntry = Assert.Single(pendingDetail.Entries, entry =>
                entry.Type == "tool" &&
                entry.ToolName == WellKnownToolNames.AskUserQuestion &&
                entry.Status == "input-required");

            var answerResult = await sessionHost.AnswerPendingQuestionAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new AnswerDesktopSessionQuestionRequest
                {
                    SessionId = startResult.Session.SessionId,
                    EntryId = pendingEntry.Id,
                    Answers =
                    [
                        new DesktopQuestionAnswer
                        {
                            QuestionIndex = 0,
                            Value = "Native host"
                        }
                    ]
                });

            Assert.Equal("completed", answerResult.ToolExecution.Status);
            Assert.Equal(WellKnownToolNames.AskUserQuestion, answerResult.ToolExecution.ToolName);
            Assert.Contains("Native host", answerResult.ToolExecution.Output);

            var finalDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = startResult.Session.SessionId
                });
            Assert.NotNull(finalDetail);
            Assert.Equal(0, finalDetail!.Summary.PendingQuestionCount);

            var resolvedPendingEntry = finalDetail.Entries.First(entry => entry.Id == pendingEntry.Id);
            Assert.Equal("answered", resolvedPendingEntry.ResolutionStatus);
            Assert.False(string.IsNullOrWhiteSpace(resolvedPendingEntry.ResolvedAt));

            var completedQuestionEntry = finalDetail.Entries.Last(entry =>
                entry.Type == "tool" &&
                entry.ToolName == WellKnownToolNames.AskUserQuestion &&
                entry.Status == "completed");
            Assert.Equal("answered-by-user", completedQuestionEntry.ResolutionStatus);
            Assert.Single(completedQuestionEntry.Answers);
            Assert.Equal("Native host", completedQuestionEntry.Answers[0].Value);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task DesktopSessionHostService_ApprovePendingToolAsync_AlwaysAllow_PersistsProjectRuleAndSkipsMatchingFutureApproval()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-approval-rule-{Guid.NewGuid():N}");
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
                    "defaultMode": "default"
                  }
                }
                """);

            var runtimeProfileService = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance));
            var compatibilityService = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var sessionCatalog = new DesktopSessionCatalogService(runtimeProfileService, new ChatRecordingService());
            var sessionHost = CreateSessionHost(runtimeProfileService, compatibilityService, sessionCatalog);

            var firstTurn = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Queue a shell approval.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.RunShellCommand,
                    ToolArgumentsJson = """{"command":"dotnet help"}""",
                    ApproveToolExecution = false
                });

            var pendingDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = firstTurn.Session.SessionId
                });
            Assert.NotNull(pendingDetail);

            var pendingEntry = Assert.Single(
                pendingDetail!.Entries,
                entry => entry.Type == "tool" && entry.Status == ToolExecutionStatus.ApprovalRequired);

            await sessionHost.ApprovePendingToolAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new ApproveDesktopSessionToolRequest
                {
                    SessionId = firstTurn.Session.SessionId,
                    EntryId = pendingEntry.Id,
                    Decision = "always-allow"
                });

            var settingsPath = Path.Combine(workspaceRoot, ".kurisu", "settings.json");
            var settingsJson = await File.ReadAllTextAsync(settingsPath);
            Assert.Contains("Bash(dotnet *)", settingsJson, StringComparison.Ordinal);

            var secondTurn = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Run the same shell family again.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.RunShellCommand,
                    ToolArgumentsJson = """{"command":"dotnet help"}""",
                    ApproveToolExecution = false
                });

            Assert.NotEqual(ToolExecutionStatus.ApprovalRequired, secondTurn.ToolExecution.Status);

            var secondDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = secondTurn.Session.SessionId
                });
            Assert.NotNull(secondDetail);
            Assert.Equal(0, secondDetail!.Summary.PendingApprovalCount);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task DesktopSessionHostService_ApprovePendingToolAsync_AlwaysAllowSession_SkipsMatchingFutureApprovalOnlyForSession()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-session-approval-rule-{Guid.NewGuid():N}");
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
                    "defaultMode": "default"
                  }
                }
                """);

            var runtimeProfileService = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance));
            var compatibilityService = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var sessionCatalog = new DesktopSessionCatalogService(runtimeProfileService, new ChatRecordingService());
            var sessionHost = CreateSessionHost(runtimeProfileService, compatibilityService, sessionCatalog);

            var firstTurn = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Queue a session-scoped shell approval.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.RunShellCommand,
                    ToolArgumentsJson = """{"command":"dotnet help"}""",
                    ApproveToolExecution = false
                });

            var pendingDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = firstTurn.Session.SessionId
                });
            Assert.NotNull(pendingDetail);
            var pendingEntry = Assert.Single(
                pendingDetail!.Entries,
                entry => entry.Type == "tool" && entry.Status == ToolExecutionStatus.ApprovalRequired);
            var extraPendingEntryId = Guid.NewGuid().ToString();
            await File.AppendAllTextAsync(
                pendingDetail.Session.TranscriptPath,
                JsonSerializer.Serialize(new
                {
                    uuid = extraPendingEntryId,
                    parentUuid = pendingEntry.Id,
                    sessionId = firstTurn.Session.SessionId,
                    timestamp = DateTime.UtcNow,
                    type = "tool",
                    cwd = workspaceRoot,
                    version = "0.1.0",
                    gitBranch = string.Empty,
                    toolName = WellKnownToolNames.RunShellCommand,
                    args = """{"command":"dotnet help"}""",
                    approvalState = "ask",
                    status = ToolExecutionStatus.ApprovalRequired,
                    output = string.Empty,
                    errorMessage = "Approval is required for run_shell_command.",
                    exitCode = 0,
                    changedFiles = Array.Empty<string>()
                }) + Environment.NewLine);

            await sessionHost.ApprovePendingToolAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new ApproveDesktopSessionToolRequest
                {
                    SessionId = firstTurn.Session.SessionId,
                    EntryId = pendingEntry.Id,
                    Decision = "always-allow-session"
                });

            var settingsJson = await File.ReadAllTextAsync(Path.Combine(workspaceRoot, ".kurisu", "settings.json"));
            Assert.DoesNotContain("Bash(dotnet *)", settingsJson, StringComparison.Ordinal);

            var sameSessionTurn = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    SessionId = firstTurn.Session.SessionId,
                    Prompt = "Run the same shell family in the same session.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.RunShellCommand,
                    ToolArgumentsJson = """{"command":"dotnet help"}""",
                    ApproveToolExecution = false
                });

            Assert.NotEqual(ToolExecutionStatus.ApprovalRequired, sameSessionTurn.ToolExecution.Status);
            var finalDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = firstTurn.Session.SessionId
                });
            Assert.NotNull(finalDetail);
            Assert.Equal("auto-approved", finalDetail!.Entries.First(entry => entry.Id == extraPendingEntryId).ResolutionStatus);
            Assert.Contains(
                finalDetail.Entries,
                entry => entry.Type == "tool" &&
                         entry.ToolName == WellKnownToolNames.RunShellCommand &&
                         entry.ResolutionStatus == "executed-after-auto-approval");

            var otherSessionTurn = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Run the same shell family in another session.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.RunShellCommand,
                    ToolArgumentsJson = """{"command":"dotnet help"}""",
                    ApproveToolExecution = false
                });

            Assert.Equal(ToolExecutionStatus.ApprovalRequired, otherSessionTurn.ToolExecution.Status);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task DesktopSessionHostService_ApprovePendingToolAsync_AlwaysAllowUser_PersistsUserRuleAndSkipsMatchingFutureApproval()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-user-approval-rule-{Guid.NewGuid():N}");
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
                    "defaultMode": "default"
                  }
                }
                """);

            var runtimeProfileService = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance));
            var compatibilityService = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var sessionCatalog = new DesktopSessionCatalogService(runtimeProfileService, new ChatRecordingService());
            var sessionHost = CreateSessionHost(runtimeProfileService, compatibilityService, sessionCatalog);

            var firstTurn = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Queue a user-scoped shell approval.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.RunShellCommand,
                    ToolArgumentsJson = """{"command":"dotnet help"}""",
                    ApproveToolExecution = false
                });

            var pendingDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = firstTurn.Session.SessionId
                });
            Assert.NotNull(pendingDetail);
            var pendingEntry = Assert.Single(
                pendingDetail!.Entries,
                entry => entry.Type == "tool" && entry.Status == ToolExecutionStatus.ApprovalRequired);

            await sessionHost.ApprovePendingToolAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new ApproveDesktopSessionToolRequest
                {
                    SessionId = firstTurn.Session.SessionId,
                    EntryId = pendingEntry.Id,
                    Decision = "always-allow-user"
                });

            var userSettingsPath = Path.Combine(homeRoot, ".kurisu", "settings.json");
            Assert.Contains("Bash(dotnet *)", await File.ReadAllTextAsync(userSettingsPath), StringComparison.Ordinal);
            Assert.DoesNotContain(
                "Bash(dotnet *)",
                await File.ReadAllTextAsync(Path.Combine(workspaceRoot, ".kurisu", "settings.json")),
                StringComparison.Ordinal);

            var secondTurn = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Run the same shell family after a user-scoped allow.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.RunShellCommand,
                    ToolArgumentsJson = """{"command":"dotnet help"}""",
                    ApproveToolExecution = false
                });

            Assert.NotEqual(ToolExecutionStatus.ApprovalRequired, secondTurn.ToolExecution.Status);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task DesktopSessionHostService_ApprovePendingToolAsync_DenyWithFeedback_ResolvesPendingEntryAndContinuesTurn()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-deny-pending-tool-{Guid.NewGuid():N}");
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
                    "ask": ["Write"]
                  }
                }
                """);

            var runtimeProfileService = new KurisuRuntimeProfileService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), new RuntimeConfigService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot)), new RuntimeSelectionStore(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot), Microsoft.Extensions.Logging.Abstractions.NullLogger<RuntimeSelectionStore>.Instance));
            var compatibilityService = new KurisuCompatibilityService(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var sessionCatalog = new DesktopSessionCatalogService(runtimeProfileService, new ChatRecordingService());
            var sessionHost = CreateSessionHost(runtimeProfileService, compatibilityService, sessionCatalog);

            var targetFile = Path.Combine(workspaceRoot, "notes.txt");
            var startResult = await sessionHost.StartTurnAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new StartDesktopSessionTurnRequest
                {
                    Prompt = "Queue a pending edit for denial.",
                    WorkingDirectory = workspaceRoot,
                    ToolName = WellKnownToolNames.WriteFile,
                    ToolArgumentsJson = $$"""{"file_path":"{{targetFile.Replace("\\", "\\\\")}}","content":"should not write"}""",
                    ApproveToolExecution = false
                });

            var pendingDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = startResult.Session.SessionId
                });
            Assert.NotNull(pendingDetail);

            var pendingEntry = Assert.Single(
                pendingDetail!.Entries,
                entry => entry.Type == "tool" && entry.Status == ToolExecutionStatus.ApprovalRequired);

            var denialResult = await sessionHost.ApprovePendingToolAsync(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new ApproveDesktopSessionToolRequest
                {
                    SessionId = startResult.Session.SessionId,
                    EntryId = pendingEntry.Id,
                    Decision = "deny",
                    Feedback = "Do not write the file. Inspect the current content first."
                });

            Assert.Equal("blocked", denialResult.ToolExecution.Status);
            Assert.Equal("deny", denialResult.ToolExecution.ApprovalState);
            Assert.False(File.Exists(targetFile));

            var finalDetail = sessionCatalog.GetSession(
                new WorkspacePaths { WorkspaceRoot = workspaceRoot },
                new GetDesktopSessionRequest
                {
                    SessionId = startResult.Session.SessionId
                });
            Assert.NotNull(finalDetail);
            Assert.Equal(0, finalDetail!.Summary.PendingApprovalCount);

            var resolvedPendingEntry = finalDetail.Entries.First(entry => entry.Id == pendingEntry.Id);
            Assert.Equal("denied", resolvedPendingEntry.ResolutionStatus);
            Assert.False(string.IsNullOrWhiteSpace(resolvedPendingEntry.ResolvedAt));

            var blockedExecutionEntry = finalDetail.Entries.Last(entry =>
                entry.Type == "tool" &&
                entry.ToolName == WellKnownToolNames.WriteFile);
            Assert.Equal("blocked", blockedExecutionEntry.Status);
            Assert.Equal("blocked-by-user", blockedExecutionEntry.ResolutionStatus);
            Assert.Contains("denied approval", blockedExecutionEntry.Body, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

}

