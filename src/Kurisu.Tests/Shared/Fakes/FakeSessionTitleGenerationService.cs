using Kurisu.App.Desktop.Bridges;

namespace Kurisu.Tests.Shared.Fakes;

internal sealed class FakeSessionTitleGenerationService : ISessionTitleGenerationService
{
    public void EnqueueTitleGeneration(
        string sessionId,
        string firstMessageText,
        string transcriptPath,
        string workingDirectory,
        string locale)
    {
        // No-op: title generation is not exercised in unit tests.
    }
}
