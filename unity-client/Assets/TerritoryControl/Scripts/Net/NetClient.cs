using System;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NativeWebSocket;
using UnityEngine;

namespace TC
{
    /// <summary>
    /// WebSocket line to the existing Render server (server.js). Same protocol as the browser game:
    /// hello, quick, bots, in, use, leave ... and the server answers with me, lobby, start, s, end, rew.
    /// Messages are delivered on the main thread through OnMessage.
    /// </summary>
    public class NetClient : MonoBehaviour
    {
        public static NetClient I;

        [Tooltip("Secure WebSocket address of the server.")]
        public string serverUrl = "wss://territory-control.onrender.com";

        public event Action<JObject> OnMessage;

        public bool Online { get; private set; }
        /// <summary>True when the free Render server is probably still starting up.</summary>
        public bool Waking { get; private set; }
        public string PlayerName { get; set; }

        WebSocket ws;
        string pid;
        float lastMsg, nextPing, nextReconnect, firstTry;
        int tries;
        bool connecting;

        void Awake()
        {
            I = this;
            pid = PlayerPrefs.GetString("tc-pid", "");
            if (string.IsNullOrEmpty(pid))
            {
                pid = Guid.NewGuid().ToString("N");
                PlayerPrefs.SetString("tc-pid", pid);
            }
            PlayerName = PlayerPrefs.GetString("tc-name", "");
        }

        void Start() { Connect(); }

        async void Connect()
        {
            if (connecting) return;
            connecting = true;
            if (firstTry <= 0f) firstTry = Time.realtimeSinceStartup;
            try
            {
                if (ws != null)
                {
                    ws.OnClose -= HandleClose;
                    try { await ws.Close(); } catch { }
                }
                ws = new WebSocket(serverUrl);
                ws.OnOpen += () =>
                {
                    connecting = false;
                    tries = 0;
                    lastMsg = Time.realtimeSinceStartup;
                    Send(new { t = "hello", pid, name = (PlayerName ?? "").Trim() });
                };
                ws.OnMessage += bytes =>
                {
                    lastMsg = Time.realtimeSinceStartup;
                    try
                    {
                        var m = JObject.Parse(Encoding.UTF8.GetString(bytes));
                        if ((string)m["t"] == "me") { Online = true; Waking = false; }
                        OnMessage?.Invoke(m);
                    }
                    catch (Exception e) { Debug.LogWarning("net parse: " + e.Message); }
                };
                ws.OnError += e => Debug.LogWarning("ws error: " + e);
                ws.OnClose += HandleClose;
                await ws.Connect();
            }
            catch (Exception e)
            {
                Debug.LogWarning("ws connect: " + e.Message);
                HandleClose(WebSocketCloseCode.Abnormal);
            }
        }

        void HandleClose(WebSocketCloseCode code)
        {
            connecting = false;
            Online = false;
            Waking = Time.realtimeSinceStartup - firstTry > 3.5f;
            nextReconnect = Time.realtimeSinceStartup + Mathf.Min(4f, 0.4f * (1 << Mathf.Min(tries++, 4)));
        }

        public void Send(object o)
        {
            if (ws == null || ws.State != WebSocketState.Open) return;
            _ = ws.SendText(JsonConvert.SerializeObject(o));
        }

        void Update()
        {
#if !UNITY_WEBGL || UNITY_EDITOR
            ws?.DispatchMessageQueue();
#endif
            float now = Time.realtimeSinceStartup;
            if (!Online && !connecting && now >= nextReconnect) Connect();
            if (ws != null && ws.State == WebSocketState.Open)
            {
                if (now >= nextPing) { nextPing = now + 3f; Send(new { t = "p" }); }
                if (now - lastMsg > 9f) { _ = ws.Close(); }
            }
        }

        void OnApplicationPause(bool paused)
        {
            if (!paused && (ws == null || ws.State != WebSocketState.Open)) { tries = 0; nextReconnect = 0; }
        }

        async void OnDestroy()
        {
            if (ws != null) { ws.OnClose -= HandleClose; try { await ws.Close(); } catch { } }
        }
    }
}
