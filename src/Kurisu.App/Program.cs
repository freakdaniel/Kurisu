using System.Runtime;
using ElectronNET;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;
using Kurisu.App.AppHost.Hosting;
using Kurisu.App.AppHost.Startup;
using Kurisu.App.AppHost.Composition;

namespace Kurisu.App;

internal static class Program
{
    private static async Task<int> Main()
    {
        GCSettings.LargeObjectHeapCompactionMode = GCLargeObjectHeapCompactionMode.CompactOnce;
        GCSettings.LatencyMode = GCLatencyMode.Interactive;

        StartupBanner.Write();

        var configuration = ConfigurationBootstrap.BuildConfiguration();
        SerilogBootstrap.Configure(configuration);

        var services = new ServiceCollection();
        services.AddSingleton(configuration);
        services.AddLogging(builder =>
        {
            builder.ClearProviders();
            builder.AddSerilog(Log.Logger, dispose: true);
        });
        services.AddDesktopShellServices(configuration);
        await using var provider = services.BuildServiceProvider();

        var runtime = ElectronNetRuntime.RuntimeController;
        ShutdownHandler.Install(runtime);

        try
        {
            var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger("Kurisu.App");
            logger.LogInformation("Starting electron runtime");

            await runtime.Start();
            await runtime.WaitReadyTask;
            await ElectronWindowBootstrap.LaunchAsync(provider, configuration, runtime);
            await runtime.WaitStoppedTask;
            return 0;
        }
        catch (Exception exception)
        {
            Log.Fatal(exception, "Application crashed unexpectedly");
            Console.WriteLine(exception);
            try
            {
                await runtime.Stop().ConfigureAwait(false);
                await runtime.WaitStoppedTask
                    .WaitAsync(TimeSpan.FromSeconds(2))
                    .ConfigureAwait(false);
            }
            catch { }
            return 1;
        }
        finally
        {
            Log.CloseAndFlush();
        }
    }
}
