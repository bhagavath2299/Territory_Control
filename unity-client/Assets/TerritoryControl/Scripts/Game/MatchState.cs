using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace TC
{
    public class PlayerState
    {
        public float x, y, a;               // server units, angle in radians (y grows downward, as in the browser game)
        public bool alive;
        public float shield, prot;
        public int run;                     // changes whenever the trail is reset
        public readonly List<Vector2> trail = new List<Vector2>(300);
        public float[] ready = { 1f, 1f };  // ability charge, 0..1
        public int flags;                   // 1 slowed, 2 ghost, 4 dashing
        public float stamp;                 // Time.time of the last snapshot
        public bool respawned, died;        // one-shot flags consumed by the views
    }

    public struct MatchEvent { public string type; public int s, x; public string y; }

    /// <summary>The current match as the server describes it. All maths stays on the server; this is only a mirror.</summary>
    public class MatchState
    {
        public const int WW = 101, WH = 177, MC = 3, MW = WW * MC, MH = WH * MC;
        public const float SPD = 12f, TURN = 7.5f;

        public static readonly Color[] Palette =
        {
            Color.clear,
            new Color32(0x2f, 0x6b, 0xff, 255), new Color32(0xff, 0x4d, 0x5e, 255), new Color32(0x1f, 0xbf, 0x75, 255),
            new Color32(0xff, 0xb0, 0x20, 255), new Color32(0x9b, 0x5c, 0xff, 255)
        };

        public int you, seed;
        public string kind = "";
        public readonly string[] names = new string[6];
        public readonly string[] skin = new string[6];
        public readonly string[] trailStyle = new string[6];
        public readonly int[] disp = new int[6];            // server slot -> colour index (you are always 1, blue)
        public readonly byte[] land = new byte[MW * MH];
        public readonly byte[] own = new byte[MW * MH];     // owner slot per cell, 0 = nobody
        public readonly int[] cells = new int[6];
        public int landCells = 1;
        public bool ownDirty, active;
        public float timeLeft;
        public readonly PlayerState[] p = new PlayerState[6];
        public readonly List<MatchEvent> events = new List<MatchEvent>();

        public MatchState() { for (int i = 0; i < 6; i++) p[i] = new PlayerState(); }

        public Color ColorOf(int slot) { return Palette[Mathf.Clamp(disp[slot], 0, 5)]; }
        public float Percent(int slot) { return cells[slot] * 100f / Mathf.Max(1, landCells); }

        public void ApplyStart(JObject m)
        {
            you = (int)m["you"];
            seed = (int)m["seed"];
            kind = (string)m["kind"] ?? "";
            var nm = m["names"] as JArray; var cos = m["cos"] as JArray;
            int k = 2;
            for (int s = 1; s <= 5; s++)
            {
                names[s] = nm != null && s < nm.Count ? (string)nm[s] ?? "" : "";
                var c = cos != null && s < cos.Count ? cos[s] as JArray : null;
                skin[s] = c != null ? (string)c[0] : "sport";
                trailStyle[s] = c != null ? (string)c[1] : "glow";
                disp[s] = s == you ? 1 : k++;
                p[s] = new PlayerState();
            }
            names[you] = "You";
            System.Array.Clear(own, 0, own.Length);
            System.Array.Clear(cells, 0, cells.Length);
            DecodeRle(m["land"] as JArray, land);
            landCells = 0;
            for (int i = 0; i < land.Length; i++) if (land[i] != 0) landCells++;
            if (landCells < 1) landCells = 1;
            timeLeft = 120f;
            active = true;
            ownDirty = true;
            events.Clear();
        }

        public void ApplySnapshot(JObject m)
        {
            timeLeft = (float)m["tl"];
            bool full = m["f"] != null;
            var pa = (JArray)m["p"];
            for (int i = 0; i < pa.Count && i < 5; i++)
            {
                int slot = i + 1;
                var a = (JArray)pa[i];
                var ps = p[slot];
                if (full) ps.trail.Clear();
                bool was = ps.alive;
                ps.x = (float)a[0]; ps.y = (float)a[1]; ps.a = (float)a[2];
                ps.alive = (int)a[3] == 1;
                ps.shield = (float)a[4];
                int run = (int)a[5];
                if (run != ps.run) { ps.trail.Clear(); ps.run = run; }
                var d = a[6] as JArray;
                if (d != null) for (int k = 0; k + 1 < d.Count; k += 2) ps.trail.Add(new Vector2((float)d[k] / 20f, (float)d[k + 1] / 20f));
                var rd = a[7] as JArray;
                if (rd != null && rd.Count >= 2) { ps.ready[0] = (float)rd[0]; ps.ready[1] = (float)rd[1]; }
                ps.flags = a.Count > 9 ? (int)a[9] : 0;
                ps.prot = a.Count > 12 ? (float)a[12] : 0f;
                ps.stamp = Time.time;
                if (!was && ps.alive) ps.respawned = true;
                if (was && !ps.alive) ps.died = true;
            }
            if (m["o"] is JArray o)
            {
                DecodeRle(o, own);
                ownDirty = true;
                System.Array.Clear(cells, 0, cells.Length);
                for (int i = 0; i < own.Length; i++) cells[own[i]]++;
            }
            if (m["e"] is JArray ev)
                foreach (var e in ev)
                {
                    var t = (JArray)e;
                    events.Add(new MatchEvent { type = (string)t[0], s = SafeInt(t, 1), x = SafeInt(t, 2), y = t.Count > 3 ? (string)t[3] : null });
                }
        }

        static int SafeInt(JArray t, int i) { return i < t.Count && t[i].Type == JTokenType.Integer ? (int)t[i] : 0; }

        static void DecodeRle(JArray r, byte[] dst)
        {
            if (r == null) return;
            int k = 0;
            for (int i = 0; i + 1 < r.Count; i += 2)
            {
                byte v = (byte)(int)r[i]; int n = (int)r[i + 1];
                int end = Mathf.Min(dst.Length, k + n);
                for (; k < end; k++) dst[k] = v;
            }
        }
    }
}
