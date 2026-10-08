using UnityEngine;

namespace TC
{
    /// <summary>
    /// Placeholder interface drawn with IMGUI so the game is playable end to end.
    /// Menu, lobby, match HUD, result. Replace with a designed UI (UI Toolkit or UGUI) once the look is signed off.
    /// </summary>
    public class HudUI : MonoBehaviour
    {
        GUIStyle title, big, small, btn, row, big20, bigWarn, bigGo, rowR, smallR, bigL; Texture2D white;
        float S = 1f;   // UI scale

        void Init()
        {
            if (title != null) return;
            white = Texture2D.whiteTexture;
            title = new GUIStyle(GUI.skin.label) { fontSize = 44, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter, normal = { textColor = Color.white } };
            big = new GUIStyle(GUI.skin.label) { fontSize = 28, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter, normal = { textColor = Color.white } };
            small = new GUIStyle(GUI.skin.label) { fontSize = 18, alignment = TextAnchor.MiddleLeft, normal = { textColor = Color.white } };
            row = new GUIStyle(small) { fontSize = 16 };
            btn = new GUIStyle(GUI.skin.button) { fontSize = 26, fontStyle = FontStyle.Bold };
            big20 = big20;
            bigWarn = new GUIStyle(big) { normal = { textColor = new Color(1f, 0.6f, 0.4f) } };
            bigGo = bigGo;
            bigL = bigL;
            rowR = rowR;
            smallR = smallR;
        }

        void Box(Rect r, Color c) { var o = GUI.color; GUI.color = c; GUI.DrawTexture(r, white); GUI.color = o; }

        bool Button(Rect r, string text, Color c)
        {
            Box(r, c);
            return GUI.Button(r, text, btn);
        }

        void OnGUI()
        {
            var mc = MatchController.I; if (mc == null) return;
            Init();
            S = Mathf.Max(1f, Screen.height / 720f);
            GUI.matrix = Matrix4x4.Scale(new Vector3(S, S, 1));
            float W = Screen.width / S, H = Screen.height / S;

            switch (mc.phase)
            {
                case Phase.Connecting: Centered(W, H, "Territory Control", NetClient.I.Waking ? "Waking the server. This can take up to a minute." : "Connecting..."); break;
                case Phase.Menu: Menu(mc, W, H); break;
                case Phase.Lobby: Lobby(mc, W, H); break;
                case Phase.Wait: Centered(W, H, "Match in progress", "You join the next round in about " + mc.WaitLeft + " s"); if (Button(new Rect(W / 2 - 110, H * 0.62f, 220, 56), "Leave", new Color(0, 0, 0, 0.5f))) mc.LeaveToMenu(); break;
                case Phase.Playing: Hud(mc, W, H); break;
                case Phase.Result: Result(mc, W, H); break;
            }
            if (Time.time < mc.NoticeUntil) { Box(new Rect(W / 2 - 220, 20, 440, 44), new Color(0, 0, 0, 0.7f)); GUI.Label(new Rect(W / 2 - 220, 20, 440, 44), mc.Notice, big); }
        }

        void Centered(float W, float H, string head, string sub)
        {
            Box(new Rect(0, 0, W, H), new Color(0.05f, 0.07f, 0.1f, 0.8f));
            GUI.Label(new Rect(0, H * 0.3f, W, 70), head, title);
            GUI.Label(new Rect(0, H * 0.3f + 80, W, 40), sub, big);
        }

        void Menu(MatchController mc, float W, float H)
        {
            Box(new Rect(0, 0, W, H), new Color(0.04f, 0.06f, 0.1f, 0.35f));
            GUI.Label(new Rect(0, H * 0.14f, W, 70), "TERRITORY CONTROL", title);
            string who = mc.Me != null ? (string)mc.Me["name"] : "";
            string lv = mc.Me != null ? "Level " + (int)mc.Me["lv"] + "   Coins " + (int)mc.Me["coins"] : "";
            GUI.Label(new Rect(0, H * 0.14f + 64, W, 36), who + "   " + lv, big20);
            float bw = Mathf.Min(360, W * 0.8f), bx = (W - bw) / 2, y = H * 0.46f;
            if (Button(new Rect(bx, y, bw, 70), "PLAY ONLINE", new Color(0.18f, 0.42f, 1f, 0.95f))) mc.PlayOnline();
            if (Button(new Rect(bx, y + 86, bw, 62), "PRACTICE VS BOTS", new Color(0.1f, 0.1f, 0.14f, 0.85f))) mc.PlayBots();
            var q = QualityManager.I;
            if (q != null && Button(new Rect(bx, y + 164, bw, 50), "Graphics: " + (q.Auto ? "Auto (" + q.Tier + ")" : q.Tier.ToString()), new Color(0.1f, 0.1f, 0.14f, 0.7f)))
            {
                if (q.Auto) q.SetTier(QualityTier.High, false);
                else if (q.Tier == QualityTier.High) q.SetTier(QualityTier.Low, false);
                else q.SetTier(QualityTier.High, true);
            }
        }

        void Lobby(MatchController mc, float W, float H)
        {
            string sub = mc.LobbyPlayers + " player" + (mc.LobbyPlayers == 1 ? "" : "s") + " in the room";
            if (mc.LobbyCountdown >= 0) sub += "   Starting in " + mc.LobbyCountdown + " s";
            else if (mc.LobbyFill > 0) sub += "   Bots join in " + mc.LobbyFill + " s";
            Centered(W, H, "Finding a match", sub);
            if (Button(new Rect(W / 2 - 110, H * 0.62f, 220, 56), "Leave", new Color(0, 0, 0, 0.5f))) mc.LeaveToMenu();
        }

        void Hud(MatchController mc, float W, float H)
        {
            var S_ = mc.S;
            int t = Mathf.Max(0, Mathf.CeilToInt(S_.timeLeft));
            string clock = (t / 60) + ":" + (t % 60).ToString("00");
            Box(new Rect(W / 2 - 60, 12, 120, 44), new Color(0, 0, 0, 0.45f));
            GUI.Label(new Rect(W / 2 - 60, 12, 120, 44), clock, (t <= 30 ? bigWarn : big));
            if (t <= 30 && t > 0) GUI.Label(new Rect(0, 60, W, 30), "FINAL RUSH", bigGo);

            // you and the leaderboard
            Box(new Rect(10, 12, 170, 38), new Color(0, 0, 0, 0.45f));
            GUI.Label(new Rect(18, 12, 160, 38), S_.Percent(S_.you).ToString("0.0") + "% land", bigL);
            int[] order = { 1, 2, 3, 4, 5 };
            System.Array.Sort(order, (a, b) => S_.cells[b].CompareTo(S_.cells[a]));
            float y = 60;
            foreach (int s in order)
            {
                if (string.IsNullOrEmpty(S_.names[s])) continue;
                Box(new Rect(10, y, 170, 24), new Color(0, 0, 0, 0.35f));
                Box(new Rect(14, y + 7, 10, 10), S_.ColorOf(s));
                GUI.Label(new Rect(30, y, 100, 24), S_.names[s], row);
                GUI.Label(new Rect(124, y, 54, 24), S_.Percent(s).ToString("0.0") + "%", rowR);
                y += 26;
            }

            // kill feed
            for (int i = S_.events.Count - 1; i >= 0; i--)
            {
                var e = S_.events[i];
                if (e.type == "ko" && e.s >= 1 && e.s <= 5)
                {
                    string victim = S_.names[e.s]; string by = e.x >= 1 && e.x <= 5 ? S_.names[e.x] : null;
                    mc.Notice = by != null ? by + " eliminated " + victim : victim + " crashed"; mc.NoticeUntil = Time.time + 2.2f;
                }
            }
            S_.events.Clear();

            if (!mc.IsAlive)
            {
                GUI.Label(new Rect(0, H * 0.4f, W, 50), "Respawning...", big);
            }
            DrawAbilityButtons(mc);
        }

        void DrawAbilityButtons(MatchController mc)
        {
            var me = mc.S.p[mc.S.you];
            for (int i = 0; i < 2; i++)
            {
                var r = InputController.ButtonRect(i);
                r = new Rect(r.x / S, r.y / S, r.width / S, r.height / S);
                float ready = me.ready[i];
                Box(r, new Color(0, 0, 0, 0.45f));
                Box(new Rect(r.x, r.y + r.height * (1f - ready), r.width, r.height * ready), ready >= 0.99f ? new Color(0.2f, 0.5f, 1f, 0.8f) : new Color(0.5f, 0.5f, 0.55f, 0.6f));
                string n = InputController.AbilityName(i);
                GUI.Label(r, char.ToUpper(n[0]) + n.Substring(1), big20);
            }
        }

        void Result(MatchController mc, float W, float H)
        {
            Box(new Rect(0, 0, W, H), new Color(0.04f, 0.06f, 0.1f, 0.78f));
            var S_ = mc.S;
            int[] order = { 1, 2, 3, 4, 5 };
            System.Array.Sort(order, (a, b) => S_.cells[b].CompareTo(S_.cells[a]));
            GUI.Label(new Rect(0, H * 0.12f, W, 70), "MATCH OVER", title);
            float y = H * 0.12f + 90; int rank = 1;
            foreach (int s in order)
            {
                if (string.IsNullOrEmpty(S_.names[s])) continue;
                float bw = Mathf.Min(420, W * 0.85f), bx = (W - bw) / 2;
                Box(new Rect(bx, y, bw, 40), s == S_.you ? new Color(0.2f, 0.4f, 1f, 0.5f) : new Color(0, 0, 0, 0.4f));
                Box(new Rect(bx + 10, y + 13, 14, 14), S_.ColorOf(s));
                GUI.Label(new Rect(bx + 34, y, 40, 40), rank + ".", big);
                GUI.Label(new Rect(bx + 70, y, 200, 40), S_.names[s], small);
                GUI.Label(new Rect(bx + bw - 90, y, 80, 40), S_.Percent(s).ToString("0.0") + "%", smallR);
                y += 46; rank++;
            }
            if (mc.Reward != null)
            {
                string r = "+" + (int)mc.Reward["xp"] + " XP    +" + (int)mc.Reward["coins"] + " coins";
                GUI.Label(new Rect(0, y + 8, W, 36), r, big);
            }
            float w = Mathf.Min(360, W * 0.8f);
            if (Button(new Rect((W - w) / 2, y + 60, w, 62), "BACK TO MENU", new Color(0.18f, 0.42f, 1f, 0.95f))) mc.LeaveToMenu();
        }
    }
}
