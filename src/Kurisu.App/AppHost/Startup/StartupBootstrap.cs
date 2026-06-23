using System.Text;
using Microsoft.Extensions.Configuration;
using Serilog;
using Serilog.Events;
using Kurisu.App.AppHost.Logging;

namespace Kurisu.App.AppHost.Startup;

/// <summary>
/// Builds the application's <see cref="IConfiguration"/> from JSON files
/// (with environment-specific overrides) and environment variables.
/// </summary>
internal static class ConfigurationBootstrap
{
    public static IConfiguration BuildConfiguration()
    {
        return new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
            .AddJsonFile(
                $"appsettings.{Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")}.json",
                optional: true,
                reloadOnChange: false)
            .AddEnvironmentVariables()
            .Build();
    }
}

/// <summary>
/// Configures the global Serilog logger and rewires the standard
/// <see cref="Console"/> streams so Electron.NET's Node-side output is
/// captured into the same log file as managed events.
/// </summary>
internal static class SerilogBootstrap
{
    public static TextWriter Configure(IConfiguration configuration)
    {
        var stdoutWriter = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false))
        {
            AutoFlush = true
        };

        Log.Logger = CreateLogger(configuration, stdoutWriter);

        Console.SetOut(new ElectronLogInterceptor(stdoutWriter, isError: false));
        Console.SetError(new ElectronLogInterceptor(stdoutWriter, isError: true));

        return stdoutWriter;
    }

    private static Serilog.ILogger CreateLogger(IConfiguration configuration, TextWriter stdoutWriter)
    {
        var logsDirectory = Path.Combine(AppContext.BaseDirectory, "logs");
        Directory.CreateDirectory(logsDirectory);

        return new LoggerConfiguration()
            .ReadFrom.Configuration(configuration)
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .WriteTo.Sink(new AnsiConsoleSink(stdoutWriter))
            .WriteTo.File(
                Path.Combine(logsDirectory, "kurisu-.log"),
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 7,
                shared: true)
            .CreateLogger();
    }
}
