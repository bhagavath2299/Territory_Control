using System;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace TC
{
    public enum Phase { Connecting, Menu, Lobby, Wait, Playing, Result }

    /// <summary>Glue: listens to the server, owns the match mirror, builds and tears down the 3D scene for each match.</summary>
    public class MatchController : MonoBehaviour
    {
        public static MatchController I;

        public Phase phase = Phase.Connecting;
        public readonly MatchState S = new MatchState();
        public JObject Me;                       // the last "me" profile from the server
        public JObject Reward;                   // the last "rew" message
        public int LobbyPlayers, LobbyCountdown = -1, LobbyFill;
        public string Notice = "";
        public float NoticeUntil;
        public int WaitLeft;

        public TerritoryGround ground;
        public CameraRig cameraRig;
        public event Action OnMatchStart, OnMatchEnd;

        readonly CarView[] cars = new CarView[6];
        readonly TrailView[] trails = new TrailView[6];

        void Awake() { I = this; }
        void Start() { NetClient.I.OnMessage += OnNet; ground.BuildShowcase(); }
        void OnDestroy() { if (NetClient.I != null) NetClient.I.OnMessage -= OnNet; }

        // ---- commands from the UI ----
        public void PlayOnline() { NetClient.I.Send(new { t = "quick" }); }
        public void PlayBots() { NetClient.I.Send(new { t = "bots" }); }
        public void LeaveToMenu()
        {
            NetClient.I.Send(new { t = "leave" });
            Teardown();
            ground.BuildShowcase();
            phase = Phase.Menu;
        }
        public void UseAbility(int slot) { NetClient.I.Send(new { t = "use", s = slot }); }

        public bool IsAlive { get { return S.active && S.p[S.you].alive; } }

        void Toast(string s) { Notice = s; NoticeUntil = Time.time + 3f; }

        // ---- server messages ----
        void OnNet(JObject m)
        {
            switch ((string)m["t"])
            {
                case "me":
                    Me = m;
                    if (phase == Phase.Connecting) phase = Phase.Menu;
                    break;
                case "lobby":
                    if (phase == Phase.Playing) break;
                    LobbyPlayers = (int)m["n"];
                    LobbyCountdown = (int)m["cd"];
                    LobbyFill = m["fl"] != null ? (int)m["fl"] : 0;
                    phase = Phase.Lobby;
                    break;
                case "wait":
                    if (phase != Phase.Playing) { WaitLeft = (int)m["left"]; phase = Phase.Wait; }
                    break;
                case "start":
                    BeginMatch(m);
                    break;
                case "s":
                    if (phase == Phase.Playing) S.ApplySnapshot(m);
                    break;
                case "end":
                    if (phase == Phase.Playing) { phase = Phase.Result; Reward = null; OnMatchEnd?.Invoke(); }
                    break;
                case "rew":
                    if (m["daily"] == null) Reward = m;
                    break;
                case "err":
                    Toast((string)m["msg"]);
                    if (phase != Phase.Playing) phase = Phase.Menu;
                    break;
                case "full":
                    Toast("That room is full.");
                    phase = Phase.Menu;
                    break;
            }
        }

        void BeginMatch(JObject m)
        {
            Teardown();
            S.ApplyStart(m);
            phase = Phase.Playing;
            Reward = null;
            var parent = new GameObject("Match").transform;
            parent.SetParent(transform, false);
            ground.Build(S, QualityManager.I);
            for (int s = 1; s <= 5; s++)
            {
                if (string.IsNullOrEmpty(S.names[s])) continue;
                var go = new GameObject("Car " + s);
                go.transform.SetParent(parent, false);
                var cv = go.AddComponent<CarView>(); cv.Init(S, s, ground); cars[s] = cv;
                var tv = go.AddComponent<TrailView>(); tv.Init(S, s, cv, ground); trails[s] = tv;
            }
            cameraRig.Follow(S, cars[S.you]);
            OnMatchStart?.Invoke();
        }

        void Teardown()
        {
            S.active = false;
            var old = transform.Find("Match");
            if (old != null) Destroy(old.gameObject);
            Array.Clear(cars, 0, cars.Length);
            Array.Clear(trails, 0, trails.Length);
        }

        void Update()
        {
            if (phase == Phase.Connecting && !NetClient.I.Online) return;
            if (S.ownDirty && S.active) { ground.Refresh(); S.ownDirty = false; }
        }
    }
}
