using Kurisu.Core.Models;

namespace Kurisu.Core.Infrastructure;

/// <summary>
/// Defines the contract for Workspace Path Resolver
/// </summary>
public interface IWorkspacePathResolver
{
    /// <summary>
    /// Resolves value
    /// </summary>
    /// <param name="configured">The configured workspace paths</param>
    /// <returns>The resulting workspace paths</returns>
    WorkspacePaths Resolve(WorkspacePaths configured);
}
