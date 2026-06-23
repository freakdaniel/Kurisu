using System.Runtime.InteropServices;
using ElectronNET.Runtime;
using Serilog;

namespace Kurisu.App.AppHost.Hosting;

/// <summary>
/// Registers handlers for external termination signals (CTRL+C, terminal
/// close, SIGHUP) so that killing the .NET host does not leave the
/// spawned Electron child process running orphaned in the background
/// </summary>
internal static class ShutdownHandler
{
    private static int _shutdownStarted;

    public static void Install(IElectronNetRuntimeController runtimeController)
    {
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            BeginShutdown(runtimeController, exitCode: 130);
        };

        if (!OperatingSystem.IsWindows())
        {
            try
            {
                PosixSignalRegistration.Create(
                    PosixSignal.SIGHUP,
                    ctx =>
                    {
                        ctx.Cancel = true;
                        BeginShutdown(runtimeController, exitCode: 129);
                    });
            }
            catch (Exception ex)
            {
                Log.Logger.Warning(ex, "Failed to register SIGHUP handler");
            }
        }
    }

    private static void BeginShutdown(IElectronNetRuntimeController runtimeController, int exitCode)
    {
        if (Interlocked.Exchange(ref _shutdownStarted, 1) != 0)
            return;

        _ = Task.Run(() => ShutdownAsync(runtimeController, exitCode));
    }

    private static async Task ShutdownAsync(IElectronNetRuntimeController runtimeController, int exitCode)
    {
        var graceful = false;
        try
        {
            Log.Logger.Information("Shutdown requested, stopping Electron runtime");
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            try
            {
                await runtimeController.Stop().ConfigureAwait(false);
                await runtimeController.WaitStoppedTask
                    .WaitAsync(cts.Token)
                    .ConfigureAwait(false);
                graceful = true;
                Log.Logger.Information("Electron runtime stopped");
            }
            catch (OperationCanceledException)
            {
                Log.Logger.Warning(
                    "Electron runtime did not stop within timeout, terminating process tree");
            }
            catch (Exception ex)
            {
                Log.Logger.Warning(ex, "Failed to stop Electron runtime correctly");
            }
        }
        finally
        {
            Log.CloseAndFlush();
            if (!graceful)
            {
                try
                {
                    using var current = System.Diagnostics.Process.GetCurrentProcess();
                    current.Kill(entireProcessTree: true);
                }
                catch (Exception ex)
                {
                    Log.Logger.Debug(ex, "Process tree kill skipped");
                }
            }
            Environment.Exit(exitCode);
        }
    }
}
