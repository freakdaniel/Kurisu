using System.Text.Json;
using System.Text.Json.Serialization;
using InfiniFrame;

namespace Kurisu.App.AppHost;

/// <summary>
/// Helpers for building and parsing InfiniFrame v2 envelope messages.
/// </summary>
/// <remarks>
/// InfiniFrame uses a versioned JSON envelope for all web messages. The
/// envelope is the only protocol accepted by <see cref="IInfiniFrameWindow"/>
/// for both post (fire-and-forget) and get (request/response) channels.
/// </remarks>
internal static class InfiniFrameInterop
{
    public const int CurrentVersion = 2;
    public const string PostCommand = "Post";
    public const string GetCommand = "Get";
    public const string GetResponseMessageId = "__infiniframe:get:response";
    public const string ReadyMessageId = "__infiniframe:ready";
    public const string ReadyAckMessageId = "__infiniframe:ready:ack";
    public const string OpenExternalMessageId = "__infiniframe:open:external";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// Builds an envelope string that can be sent via
    /// <see cref="IInfiniFrameWindow.SendWebMessage"/>.
    /// </summary>
    /// <param name="id">The destination handler id (channel name).</param>
    /// <param name="dataJson">Optional pre-serialized payload (null for none).</param>
    /// <param name="command">The envelope command ("Post" by default).</param>
    /// <param name="requestId">Optional request id for Get responses.</param>
    public static string CreateEnvelope(string id, string? dataJson, string command = PostCommand, string? requestId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentException.ThrowIfNullOrWhiteSpace(command);

        var buffer = new System.Text.StringBuilder(128);
        buffer.Append("{\"id\":\"").Append(JsonEncodedText.Encode(id)).Append("\",");
        buffer.Append("\"command\":\"").Append(JsonEncodedText.Encode(command)).Append("\",");
        if (!string.IsNullOrWhiteSpace(requestId))
        {
            buffer.Append("\"requestId\":\"").Append(JsonEncodedText.Encode(requestId)).Append("\",");
        }

        buffer.Append("\"data\":");
        buffer.Append(dataJson is null ? "null" : dataJson);
        buffer.Append(",\"version\":").Append(CurrentVersion).Append('}');
        return buffer.ToString();
    }

    /// <summary>
    /// Builds a Get response envelope for a successful handler invocation.
    /// </summary>
    public static string CreateGetSuccessResponse(string requestId, string dataJson)
    {
        var payload = JsonSerializer.Serialize(
            new GetResponsePayload
            {
                RequestId = requestId,
                Success = true,
                Data = dataJson
            },
            JsonOptions);

        return CreateEnvelope(GetResponseMessageId, payload, GetCommand, requestId);
    }

    /// <summary>
    /// Builds a Get response envelope for a failed handler invocation.
    /// </summary>
    public static string CreateGetErrorResponse(string requestId, string error)
    {
        var payload = JsonSerializer.Serialize(
            new GetResponsePayload
            {
                RequestId = requestId,
                Success = false,
                Error = error
            },
            JsonOptions);

        return CreateEnvelope(GetResponseMessageId, payload, GetCommand, requestId);
    }

    /// <summary>
    /// Serializes a managed payload to the JSON form expected by the envelope.
    /// </summary>
    public static string SerializeData(object? payload)
        => JsonSerializer.Serialize(payload, JsonOptions);

    private sealed class GetResponsePayload
    {
        public string RequestId { get; set; } = string.Empty;
        public bool Success { get; set; }
        public string? Data { get; set; }
        public string? Error { get; set; }
    }
}
