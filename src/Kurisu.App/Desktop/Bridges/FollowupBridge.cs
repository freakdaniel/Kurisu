using Microsoft.Extensions.Options;
using Kurisu.Core.Followup;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Models;
using Kurisu.App.Desktop.State;

namespace Kurisu.App.Desktop.Bridges;

/// <summary>
/// Represents the Followup Projection Service
/// </summary>
/// <param name="options">The options</param>
/// <param name="workspacePathResolver">The workspace path resolver</param>
/// <param name="followupSuggestionService">The followup suggestion service</param>
public sealed class FollowupBridge(
    IOptions<DesktopShellOptions> options,
    IWorkspacePathResolver workspacePathResolver,
    IFollowupSuggestionService followupSuggestionService) : IFollowupBridge
{
    private readonly DesktopShellOptions shellOptions = options.Value;

    /// <summary>
    /// Gets suggestions async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to followup suggestion snapshot</returns>
    public Task<FollowupSuggestionSnapshot> GetSuggestionsAsync(
        GetFollowupSuggestionsRequest request,
        CancellationToken cancellationToken = default) =>
        followupSuggestionService.GetSuggestionsAsync(
            workspacePathResolver.Resolve(shellOptions.Workspace),
            request,
            cancellationToken);
}
