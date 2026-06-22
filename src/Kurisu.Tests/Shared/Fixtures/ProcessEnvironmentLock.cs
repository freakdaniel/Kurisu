namespace Kurisu.Tests.Shared.Fixtures;

internal static class ProcessEnvironmentLock
{
    public static object Gate { get; } = new();
}
