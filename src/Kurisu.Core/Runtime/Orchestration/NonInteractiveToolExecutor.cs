using Kurisu.Core.Models;
using Kurisu.Core.Tools;

namespace Kurisu.Core.Runtime;

/// <summary>
/// Represents the Non Interactive Tool Executor
/// </summary>
/// <param name="toolExecutor">The tool executor</param>
public sealed class NonInteractiveToolExecutor(IToolExecutor toolExecutor) : INonInteractiveToolExecutor
{
    /// <summary>
    /// Executes async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <param name="toolCall">The tool call</param>
    /// <param name="eventSink">The optional event sink</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to native tool execution result</returns>
    public Task<NativeToolExecutionResult> ExecuteAsync(
        AssistantTurnRequest request,
        AssistantToolCall toolCall,
        Action<AssistantRuntimeEvent>? eventSink = null,
        CancellationToken cancellationToken = default) =>
        toolExecutor.ExecuteAsync(
            new WorkspacePaths
            {
                WorkspaceRoot = request.RuntimeProfile.ProjectRoot
            },
            new ExecuteNativeToolRequest
            {
                ToolName = toolCall.ToolName,
                ArgumentsJson = string.IsNullOrWhiteSpace(toolCall.ArgumentsJson) ? "{}" : toolCall.ArgumentsJson,
                SessionId = request.SessionId,
                ApproveExecution = false
            },
            eventSink,
            cancellationToken);
}
