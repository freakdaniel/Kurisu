using Microsoft.Extensions.Options;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Models;
using Kurisu.Core.Prompts;
using Kurisu.App.Desktop.State;

namespace Kurisu.App.Desktop.Bridges;

/// <summary>
/// Represents the Prompt Projection Service
/// </summary>
/// <param name="options">The options</param>
/// <param name="workspacePathResolver">The workspace path resolver</param>
/// <param name="promptRegistryService">The prompt registry service</param>
public sealed class PromptBridge(
    IOptions<DesktopShellOptions> options,
    IWorkspacePathResolver workspacePathResolver,
    IPromptRegistryService promptRegistryService) : IPromptBridge
{
    private readonly DesktopShellOptions shellOptions = options.Value;

    /// <summary>
    /// Gets prompt registry async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to prompt registry snapshot</returns>
    public Task<PromptRegistrySnapshot> GetPromptRegistryAsync(
        GetPromptRegistryRequest request,
        CancellationToken cancellationToken = default) =>
        promptRegistryService.GetSnapshotAsync(ResolveWorkspace(), request, cancellationToken);

    /// <summary>
    /// Invokes registered prompt async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to mcp prompt invocation result</returns>
    public Task<McpPromptInvocationResult> InvokeRegisteredPromptAsync(
        InvokePromptRegistryEntryRequest request,
        CancellationToken cancellationToken = default) =>
        promptRegistryService.InvokeAsync(ResolveWorkspace(), request, cancellationToken);

    private WorkspacePaths ResolveWorkspace() => workspacePathResolver.Resolve(shellOptions.Workspace);
}
