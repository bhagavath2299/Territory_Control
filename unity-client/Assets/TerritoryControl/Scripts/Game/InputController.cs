using UnityEngine;

namespace TC
{
    /// <summary>
    /// Free-angle steering like the browser game: touch anywhere and drag, the car turns toward the drag direction.
    /// Bottom-right buttons hold ability 1 (usually Boost) and tap ability 2. Editor and desktop: mouse steers, Space boosts, E = ability 2.
    /// </summary>
    public class InputController : MonoBehaviour
    {
        public static InputController I;

        public float TargetAngle;   // server-space radians (y down)
        public bool Boost;          // ability 1 held

        float anchorX, anchorY; int steerId = -1;
        int boostId = -1, ab2Id = -1;
        float inT, sentA; bool sentB;

        /// <summary>Button rectangle in screen pixels, GUI space (origin top-left). idx 0 = ability 1, 1 = ability 2.</summary>
        public static Rect ButtonRect(int idx)
        {
            float d = Mathf.Min(Screen.width, Screen.height) * (idx == 0 ? 0.20f : 0.15f);
            float m = d * 0.25f;
            if (idx == 0) return new Rect(Screen.width - d - m, Screen.height - d - m * 1.5f, d, d);
            return new Rect(Screen.width - d - m * 4.2f - d * 0.2f, Screen.height - d - m * 1.1f - d * 0.35f, d, d);
        }

        void Awake() { I = this; }

        static bool Hit(Rect r, Vector2 p) { return r.Contains(new Vector2(p.x, Screen.height - p.y)); }

        void Update()
        {
            var mc = MatchController.I;
            if (mc == null || mc.phase != Phase.Playing || !mc.S.active) { Boost = false; steerId = boostId = ab2Id = -1; return; }
            var me = mc.S.p[mc.S.you];
            float dpiScale = Mathf.Max(1f, (Screen.dpi > 0 ? Screen.dpi : 160f) / 160f);

            bool pressedBoost = false;
            if (Input.touchCount > 0)
            {
                foreach (var t in Input.touches)
                {
                    if (t.phase == TouchPhase.Began)
                    {
                        if (Hit(ButtonRect(0), t.position)) { boostId = t.fingerId; if (!AbilityIsBoost(0)) mc.UseAbility(1); continue; }
                        if (Hit(ButtonRect(1), t.position)) { ab2Id = t.fingerId; if (!AbilityIsBoost(1)) mc.UseAbility(2); continue; }
                        if (steerId < 0) { steerId = t.fingerId; anchorX = t.position.x; anchorY = t.position.y; }
                    }
                    else if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled)
                    {
                        if (t.fingerId == steerId) steerId = -1;
                        if (t.fingerId == boostId) boostId = -1;
                        if (t.fingerId == ab2Id) ab2Id = -1;
                    }
                    if (t.fingerId == steerId)
                    {
                        float vx = t.position.x - anchorX, vy = t.position.y - anchorY;
                        float L = Mathf.Sqrt(vx * vx + vy * vy), leash = 40f * dpiScale;
                        if (L > leash) { anchorX += vx * (1f - leash / L); anchorY += vy * (1f - leash / L); }
                        if (L > 6f * dpiScale) TargetAngle = Mathf.Atan2(-vy, vx);
                    }
                }
                pressedBoost = (boostId >= 0 && AbilityIsBoost(0)) || (ab2Id >= 0 && AbilityIsBoost(1));
            }
            else if (!Input.touchSupported || Application.isEditor)
            {
                // mouse / editor: steer toward the pointer relative to the car on screen
                var cam = Camera.main;
                if (cam != null && me.alive)
                {
                    Vector3 sp = cam.WorldToScreenPoint(new Vector3(me.x, 0.3f, MatchState.WH - me.y));
                    float vx = Input.mousePosition.x - sp.x, vy = Input.mousePosition.y - sp.y;
                    if (vx * vx + vy * vy > 400f) TargetAngle = Mathf.Atan2(-vy, vx);
                }
                bool k1 = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.LeftShift) || Input.GetMouseButton(0);
                bool k2 = Input.GetKey(KeyCode.E);
                if ((Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.LeftShift)) && !AbilityIsBoost(0)) mc.UseAbility(1);
                if (Input.GetKeyDown(KeyCode.E) && !AbilityIsBoost(1)) mc.UseAbility(2);
                pressedBoost = (k1 && AbilityIsBoost(0)) || (k2 && AbilityIsBoost(1));
            }
            Boost = pressedBoost;

            inT += Time.deltaTime;
            if (inT > 0.1f || (inT > 0.033f && (Mathf.Abs(Mathf.DeltaAngle(sentA * Mathf.Rad2Deg, TargetAngle * Mathf.Rad2Deg)) > 3.4f || Boost != sentB)))
            {
                inT = 0f; sentA = TargetAngle; sentB = Boost;
                NetClient.I.Send(new { t = "in", a = Mathf.Round(TargetAngle * 100f) / 100f, b = Boost ? 1 : 0 });
            }
        }

        public static bool AbilityIsBoost(int slot)
        {
            var mc = MatchController.I;
            var ab = mc != null && mc.Me != null ? mc.Me["ab"] as Newtonsoft.Json.Linq.JArray : null;
            string name = ab != null && slot < ab.Count ? (string)ab[slot] : (slot == 0 ? "boost" : "dash");
            return name == "boost";
        }

        public static string AbilityName(int slot)
        {
            var mc = MatchController.I;
            var ab = mc != null && mc.Me != null ? mc.Me["ab"] as Newtonsoft.Json.Linq.JArray : null;
            return ab != null && slot < ab.Count ? (string)ab[slot] : (slot == 0 ? "boost" : "dash");
        }
    }
}
