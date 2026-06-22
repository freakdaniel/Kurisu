using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Kurisu.App.Ipc.Attributes;
using Kurisu.Core.Models;

namespace Kurisu.App.Ipc;

/// <summary>
/// Provides the base implementation for transport-agnostic IPC service dispatch.
/// </summary>
public abstract class IpcServiceBase
{
    /// <summary>
    /// Gets the services.
    /// </summary>
    protected IServiceProvider Services { get; }

    /// <summary>
    /// Gets the logger.
    /// </summary>
    protected ILogger Logger { get; }

    private readonly Lazy<IReadOnlyDictionary<string, InvokeBinding>> _invokeBindings;
    private readonly Lazy<IReadOnlyList<EventBinding>> _eventBindings;
    private int _eventsRegistered;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="IpcServiceBase"/> class.
    /// </summary>
    /// <param name="services">The services.</param>
    protected IpcServiceBase(IServiceProvider services)
    {
        Services = services;
        Logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("Kurisu.App.Ipc");
        _invokeBindings = new Lazy<IReadOnlyDictionary<string, InvokeBinding>>(() => CreateInvokeBindings());
        _eventBindings = new Lazy<IReadOnlyList<EventBinding>>(() => CreateEventBindings());
    }

    /// <summary>
    /// Gets the registered invoke bindings keyed by channel. Transports consume
    /// this to wire each channel to the underlying RPC mechanism.
    /// </summary>
    public IReadOnlyDictionary<string, InvokeBinding> InvokeBindings => _invokeBindings.Value;

    /// <summary>
    /// Executes an invoke-style IPC call for the specified channel.
    /// </summary>
    /// <param name="channel">The IPC channel.</param>
    /// <param name="payloadJson">The serialized JSON payload.</param>
    /// <returns>A task resolving to the handler result.</returns>
    public async Task<object?> InvokeChannelAsync(string channel, string? payloadJson)
    {
        if (!_invokeBindings.Value.TryGetValue(channel, out var binding))
        {
            throw new InvalidOperationException($"No IPC handler is registered for channel '{channel}'.");
        }

        Logger.LogDebug("IPC invoke received: {Channel}", channel);
        var argument = binding.DeserializeArgument(payloadJson);
        var result = await binding.InvokeAsync(this, argument).ConfigureAwait(false);
        Logger.LogDebug("IPC invoke completed: {Channel}", channel);
        return result;
    }

    /// <summary>
    /// Registers event emitters for all event channels declared on the IPC service.
    /// </summary>
    /// <param name="emit">The callback used to publish event payloads.</param>
    public void RegisterEventChannels(Action<string, object?> emit)
    {
        if (Interlocked.Exchange(ref _eventsRegistered, 1) == 1)
        {
            return;
        }

        foreach (var binding in _eventBindings.Value)
        {
            binding.Register(this, emit);
        }
    }

    /// <summary>
    /// Serializes a payload using the shared IPC serializer options.
    /// </summary>
    /// <param name="payload">The payload to serialize.</param>
    /// <returns>The JSON payload.</returns>
    protected internal static string SerializePayload(object? payload)
        => JsonSerializer.Serialize(payload, JsonOptions);

    private IReadOnlyDictionary<string, InvokeBinding> CreateInvokeBindings()
    {
        var methods = GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        return methods
            .Select(method => (Method: method, Invoke: method.GetCustomAttribute<IpcInvokeAttribute>()))
            .Where(entry => entry.Invoke is not null)
            .ToDictionary(
                entry => entry.Invoke!.Channel,
                entry => new InvokeBinding(entry.Invoke.Channel, entry.Method, GetSingleParameterType(entry.Method)),
                StringComparer.Ordinal);
    }

    private IReadOnlyList<EventBinding> CreateEventBindings()
    {
        var methods = GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        var bindings = new List<EventBinding>();

        foreach (var method in methods)
        {
            if (method.GetCustomAttribute<IpcEventAttribute>() is not { } evt)
            {
                continue;
            }

            var parameters = method.GetParameters();
            if (parameters.Length != 1 ||
                !parameters[0].ParameterType.IsGenericType ||
                parameters[0].ParameterType.GetGenericTypeDefinition() != typeof(Action<>))
            {
                continue;
            }

            bindings.Add(new EventBinding(
                evt.Channel,
                method,
                parameters[0].ParameterType.GetGenericArguments()[0]));
        }

        return bindings;
    }

    private static Type? GetSingleParameterType(MethodInfo method)
    {
        var parameters = method.GetParameters()
            .Where(parameter => parameter.ParameterType != typeof(CancellationToken))
            .ToArray();

        return parameters.Length == 1 ? parameters[0].ParameterType : null;
    }

    private sealed record EventBinding(string Channel, MethodInfo Method, Type PayloadType)
    {
        public void Register(IpcServiceBase owner, Action<string, object?> emit)
        {
            var emitterType = typeof(EventEmitter<>).MakeGenericType(PayloadType);
            var emitter = Activator.CreateInstance(emitterType, Channel, emit)
                ?? throw new InvalidOperationException($"Failed to create event emitter for channel '{Channel}'.");
            var actionType = typeof(Action<>).MakeGenericType(PayloadType);
            var handler = Delegate.CreateDelegate(actionType, emitter, emitterType.GetMethod(nameof(EventEmitter<object>.Emit))!);
            Method.Invoke(owner, [handler]);
        }
    }

    private sealed class EventEmitter<T>(string channel, Action<string, object?> emit)
    {
        public void Emit(T payload) => emit(channel, payload);
    }
}

/// <summary>
/// Describes a single invoke-style IPC binding exposed by an
/// <see cref="IpcServiceBase"/>-derived service.
/// </summary>
/// <param name="Channel">The transport channel name.</param>
/// <param name="Method">The reflected method to invoke.</param>
/// <param name="ParameterType">The expected request type, or null when the method takes no payload.</param>
public sealed record InvokeBinding(string Channel, MethodInfo Method, Type? ParameterType)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    /// <summary>
    /// Invokes the underlying method on <paramref name="owner"/>, awaiting its task if necessary.
    /// </summary>
    /// <param name="owner">The IPC service instance that owns the bound method.</param>
    /// <param name="argument">The deserialized payload to pass to the method.</param>
    public async Task<object?> InvokeAsync(object owner, object? argument)
    {
        var args = argument is null ? Array.Empty<object?>() : [argument];
        var result = Method.Invoke(owner, args);
        if (result is Task task)
        {
            await task.ConfigureAwait(false);
            return task.GetType().GetProperty("Result")?.GetValue(task);
        }
        return result;
    }

    /// <summary>
    /// Deserializes the supplied JSON payload to the method's expected parameter type.
    /// </summary>
    public object? DeserializeArgument(string? payloadJson)
    {
        if (ParameterType is null)
        {
            return null;
        }

        var json = string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson;
        if (ParameterType == typeof(string))
        {
            return JsonSerializer.Deserialize<string>(json, JsonOptions) ?? string.Empty;
        }
        return JsonSerializer.Deserialize(json, ParameterType, JsonOptions);
    }
}
