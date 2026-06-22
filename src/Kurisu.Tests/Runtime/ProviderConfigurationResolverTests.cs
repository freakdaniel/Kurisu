using Kurisu.Core.Auth;

namespace Kurisu.Tests.Runtime;

public sealed class ProviderConfigurationResolverTests
{
    [Fact]
    public void ProviderConfigurationResolver_Resolve_ReadsMergedSettingsAndModelProviderOverrides()
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-provider-config-{Guid.NewGuid():N}");
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
                      "selectedType": "openai",
                      "baseUrl": "https://should-not-win.example/v1",
                      "apiKey": "direct-settings-key"
                    }
                  },
                  "env": {
                    "CUSTOM_OPENAI_KEY": "env-settings-key",
                    "OPENAI_BASE_URL": "https://env-base.example/v1"
                  },
                  "model": {
                    "name": "kurisu-max",
                    "generationConfig": {
                      "customHeaders": {
                        "X-Settings-Header": "settings"
                      },
                      "extra_body": {
                        "reasoning_mode": "balanced"
                      }
                    }
                  },
                  "modelProviders": {
                    "openai": [
                      {
                        "id": "kurisu-max",
                        "envKey": "CUSTOM_OPENAI_KEY",
                        "baseUrl": "https://provider.example/v1",
                        "generationConfig": {
                          "customHeaders": {
                            "X-Provider-Header": "provider"
                          },
                          "extra_body": {
                            "thinking": {
                              "type": "enabled"
                            }
                          }
                        }
                      }
                    ]
                  }
                }
                """);

            var runtimeProfile = new KurisuRuntimeProfile
            {
                ProjectRoot = workspaceRoot,
                GlobalKurisuDirectory = Path.Combine(homeRoot, ".kurisu"),
                RuntimeBaseDirectory = Path.Combine(homeRoot, ".kurisu"),
                RuntimeSource = "project-settings",
                ProjectDataDirectory = Path.Combine(homeRoot, ".kurisu", "projects", "test"),
                ChatsDirectory = Path.Combine(homeRoot, ".kurisu", "projects", "test", "chats"),
                HistoryDirectory = Path.Combine(homeRoot, ".kurisu", "history", "test"),
                ContextFileNames = ["QWEN.md"],
                ContextFilePaths = [Path.Combine(workspaceRoot, "QWEN.md")],
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

            var resolver = new ProviderConfigurationResolver(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var resolved = resolver.Resolve(
                new AssistantTurnRequest
                {
                    SessionId = "resolver-session",
                    Prompt = "Resolve runtime settings.",
                    WorkingDirectory = workspaceRoot,
                    TranscriptPath = Path.Combine(runtimeProfile.ChatsDirectory, "resolver-session.jsonl"),
                    RuntimeProfile = runtimeProfile,
                    GitBranch = "main",
                    ToolExecution = new NativeToolExecutionResult
                    {
                        ToolName = string.Empty,
                        Status = "not-requested",
                        ApprovalState = "allow",
                        WorkingDirectory = workspaceRoot,
                        Output = string.Empty,
                        ErrorMessage = string.Empty,
                        ExitCode = 0,
                        ChangedFiles = []
                    }
                },
                new NativeAssistantRuntimeOptions
                {
                    Provider = "kurisu-compatible",
                    Model = string.Empty,
                    Endpoint = string.Empty,
                    ApiKey = string.Empty,
                    ApiKeyEnvironmentVariable = "QWENCODE_ASSISTANT_API_KEY"
                });

            Assert.Equal("openai", resolved.AuthType);
            Assert.Equal("kurisu-max", resolved.Model);
            Assert.Equal("https://provider.example/v1/chat/completions", resolved.Endpoint);
            Assert.Equal("env-settings-key", resolved.ApiKey);
            Assert.Equal("CUSTOM_OPENAI_KEY", resolved.ApiKeyEnvironmentVariable);
            Assert.Equal("settings", resolved.Headers["X-Settings-Header"]);
            Assert.Equal("provider", resolved.Headers["X-Provider-Header"]);
            Assert.Equal("balanced", resolved.ExtraBody["reasoning_mode"]?.GetValue<string>());
            Assert.Equal("enabled", resolved.ExtraBody["thinking"]?["type"]?.GetValue<string>());
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }


    [Theory]
    [InlineData("openrouter", "OPENROUTER_API_KEY", "https://openrouter.ai/api/v1/chat/completions", "openrouter")]
    [InlineData("deepseek", "DEEPSEEK_API_KEY", "https://api.deepseek.com/v1/chat/completions", "deepseek")]
    [InlineData("modelscope", "MODELSCOPE_API_KEY", "https://api.modelscope.cn/v1/chat/completions", "modelscope")]
    public void ProviderConfigurationResolver_Resolve_UsesProviderAliasDefaults(
        string authType,
        string expectedEnvKey,
        string expectedEndpoint,
        string expectedFlavor)
    {
        var root = Path.Combine(Path.GetTempPath(), $"kurisu-provider-alias-{authType}-{Guid.NewGuid():N}");
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
                $$"""
                {
                  "security": {
                    "auth": {
                      "selectedType": "{{authType}}"
                    }
                  },
                  "env": {
                    "{{expectedEnvKey}}": "provider-key"
                  },
                  "model": {
                    "name": "provider-model"
                  }
                }
                """);

            var runtimeProfile = CreateRuntimeProfile(workspaceRoot, homeRoot);
            var resolver = new ProviderConfigurationResolver(new FakeDesktopEnvironmentPaths(homeRoot, systemRoot));
            var resolved = resolver.Resolve(
                CreateTurnRequest(workspaceRoot, runtimeProfile, $"alias-{authType}"),
                new NativeAssistantRuntimeOptions
                {
                    Provider = "openai-compatible"
                });

            Assert.Equal(authType, resolved.AuthType);
            Assert.Equal(expectedFlavor, resolved.ProviderFlavor);
            Assert.Equal(expectedEnvKey, resolved.ApiKeyEnvironmentVariable);
            Assert.Equal(expectedEndpoint, resolved.Endpoint);
            Assert.Equal("provider-key", resolved.ApiKey);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static AssistantTurnRequest CreateTurnRequest(string workspaceRoot, KurisuRuntimeProfile runtimeProfile, string sessionId) =>
        new()
        {
            SessionId = sessionId,
            Prompt = "Resolve runtime settings.",
            WorkingDirectory = workspaceRoot,
            TranscriptPath = Path.Combine(runtimeProfile.ChatsDirectory, $"{sessionId}.jsonl"),
            RuntimeProfile = runtimeProfile,
            GitBranch = "main",
            ToolExecution = new NativeToolExecutionResult
            {
                ToolName = string.Empty,
                Status = "not-requested",
                ApprovalState = "allow",
                WorkingDirectory = workspaceRoot,
                Output = string.Empty,
                ErrorMessage = string.Empty,
                ExitCode = 0,
                ChangedFiles = []
            }
        };

    private static KurisuRuntimeProfile CreateRuntimeProfile(string workspaceRoot, string homeRoot) =>
        new()
        {
            ProjectRoot = workspaceRoot,
            GlobalKurisuDirectory = Path.Combine(homeRoot, ".kurisu"),
            RuntimeBaseDirectory = Path.Combine(homeRoot, ".kurisu"),
            RuntimeSource = "project-settings",
            ProjectDataDirectory = Path.Combine(homeRoot, ".kurisu", "projects", "test"),
            ChatsDirectory = Path.Combine(homeRoot, ".kurisu", "projects", "test", "chats"),
            HistoryDirectory = Path.Combine(homeRoot, ".kurisu", "history", "test"),
            ContextFileNames = ["QWEN.md"],
            ContextFilePaths = [Path.Combine(workspaceRoot, "QWEN.md")],
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