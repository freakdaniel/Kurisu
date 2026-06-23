using Kurisu.Core.Models;

namespace Kurisu.App.Desktop.Bridges;

/// <summary>
/// Defines the contract for Desktop Prompt Projection Service
/// </summary>
public interface IPromptBridge
{
    /// <summary>
    /// Gets prompt registry async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to prompt registry snapshot</returns>
    Task<PromptRegistrySnapshot> GetPromptRegistryAsync(
        GetPromptRegistryRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Invokes registered prompt async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to mcp prompt invocation result</returns>
    Task<McpPromptInvocationResult> InvokeRegisteredPromptAsync(
        InvokePromptRegistryEntryRequest request,
        CancellationToken cancellationToken = default);
}
