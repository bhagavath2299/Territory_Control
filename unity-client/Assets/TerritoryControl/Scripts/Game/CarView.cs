using UnityEngine;

namespace TC
{
    /// <summary>
    /// One car. The server decides where it is; this smooths it between snapshots and, for your own car,
    /// predicts steering locally so it reacts at once (same approach as the browser game).
    /// If a CC0 car prefab is assigned in GameAssets it is used, otherwise a simple procedural car is built.
    /// </summary>
    public class CarView : MonoBehaviour
    {
        MatchState S; int slot; TerritoryGround ground; PlayerState ps;
        public float rx, ry, ra;                 // smoothed position (server units) and heading
        bool mine, init; Transform body; Renderer[] rends; float lean, lastRa;

        public Vector3 WorldPos { get { return transform.position; } }
        public Color Color { get; private set; }
        public bool Visible { get { return body != null && body.gameObject.activeSelf; } }

        public void Init(MatchState s, int slotId, TerritoryGround g)
        {
            S = s; slot = slotId; ground = g; ps = S.p[slot]; mine = slot == S.you; Color = S.ColorOf(slot);
            var assets = GameAssets.I;
            var prefab = assets != null ? assets.CarPrefab(S.skin[slot]) : null;
            body = new GameObject("Body").transform;
            body.SetParent(transform, false);
            if (prefab != null) { var inst = Instantiate(prefab, body); inst.transform.localPosition = Vector3.zero; }
            else BuildProcedural(S.skin[slot]);
            rends = body.GetComponentsInChildren<Renderer>();
            body.gameObject.SetActive(false);
        }

        void BuildProcedural(string skin)
        {
            var a = GameAssets.I;
            float len = skin == "f1" ? 2.3f : skin == "muscle" ? 2.1f : 1.9f;
            float wid = skin == "f1" ? 1.0f : 0.95f;
            float hgt = skin == "f1" ? 0.32f : 0.42f;
            var paint = Instantiate(a.carBodyMaterial); paint.color = Color; paint.SetColor("_BaseColor", Color);
            Part(PrimitiveType.Cube, new Vector3(wid, hgt, len), new Vector3(0, 0.34f, 0), paint);
            if (skin != "f1") Part(PrimitiveType.Cube, new Vector3(wid * 0.82f, 0.30f, len * 0.46f), new Vector3(0, 0.62f, -len * 0.06f), a.glassMaterial);
            else Part(PrimitiveType.Cube, new Vector3(wid * 0.36f, 0.22f, len * 0.3f), new Vector3(0, 0.56f, -len * 0.05f), a.carDarkMaterial);
            float wz = len * 0.32f, wx = wid * 0.54f;
            foreach (var sx in new[] { -1f, 1f }) foreach (var sz in new[] { -1f, 1f })
                {
                    var w = Part(PrimitiveType.Cylinder, new Vector3(0.36f, 0.09f, 0.36f), new Vector3(sx * wx, 0.18f, sz * wz), a.carDarkMaterial);
                    w.transform.localRotation = Quaternion.Euler(0, 0, 90);
                }
            foreach (var sx in new[] { -1f, 1f })
                Part(PrimitiveType.Cube, new Vector3(0.2f, 0.1f, 0.06f), new Vector3(sx * wid * 0.3f, 0.38f, len * 0.5f), a.lightMaterial);
        }

        GameObject Part(PrimitiveType t, Vector3 scale, Vector3 pos, Material m)
        {
            var g = GameObject.CreatePrimitive(t);
            Destroy(g.GetComponent<Collider>());
            g.transform.SetParent(body, false);
            g.transform.localScale = scale; g.transform.localPosition = pos;
            var r = g.GetComponent<Renderer>(); r.sharedMaterial = m;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            return g;
        }

        static float AngD(float from, float to)
        {
            float d = to - from;
            while (d > Mathf.PI) d -= 2f * Mathf.PI;
            while (d < -Mathf.PI) d += 2f * Mathf.PI;
            return d;
        }

        void Update()
        {
            if (S == null || !S.active) return;
            if (ps.died) { ps.died = false; body.gameObject.SetActive(false); }
            if (!ps.alive) { body.gameObject.SetActive(false); return; }
            float dt = Time.deltaTime;
            float age = Mathf.Min(0.12f, Time.time - ps.stamp);

            if (!init || ps.respawned)
            {
                rx = ps.x; ry = ps.y; ra = ps.a; lastRa = ra; init = true; ps.respawned = false;
                body.gameObject.SetActive(true);
            }
            if (!body.gameObject.activeSelf) body.gameObject.SetActive(true);

            if (mine)
            {
                var inp = InputController.I;
                float want = inp != null ? inp.TargetAngle : ps.a;
                float step = MatchState.TURN * dt, d = AngD(ra, want);
                ra += Mathf.Abs(d) < step ? d : Mathf.Sign(d) * step;
                float mul = inp != null && inp.Boost && BoostReady() > 0f ? 1.6f : 1f;
                float v = MatchState.SPD * mul;
                rx = Mathf.Clamp(rx + Mathf.Cos(ra) * v * dt, 0.9f, MatchState.WW - 0.9f);
                ry = Mathf.Clamp(ry + Mathf.Sin(ra) * v * dt, 0.9f, MatchState.WH - 0.9f);
                float tx = ps.x + Mathf.Cos(ps.a) * MatchState.SPD * age, ty = ps.y + Mathf.Sin(ps.a) * MatchState.SPD * age;
                float k = Mathf.Min(1f, dt * 9f);
                rx += (tx - rx) * k; ry += (ty - ry) * k;
                if (Mathf.Sqrt((tx - rx) * (tx - rx) + (ty - ry) * (ty - ry)) > 1.6f) { rx = tx; ry = ty; }
            }
            else
            {
                float tx = ps.x + Mathf.Cos(ps.a) * MatchState.SPD * 0.92f * age, ty = ps.y + Mathf.Sin(ps.a) * MatchState.SPD * 0.92f * age;
                float k = Mathf.Min(1f, dt * 14f);
                rx += (tx - rx) * k; ry += (ty - ry) * k;
                ra += AngD(ra, ps.a) * Mathf.Min(1f, dt * 14f);
            }

            float h = ground.HeightAt(rx, ry);
            transform.position = new Vector3(rx, h + 0.02f, MatchState.WH - ry);
            float yaw = Mathf.Atan2(Mathf.Cos(ra), -Mathf.Sin(ra)) * Mathf.Rad2Deg;
            float turnRate = AngD(lastRa, ra) / Mathf.Max(dt, 0.001f); lastRa = ra;
            lean = Mathf.Lerp(lean, Mathf.Clamp(-turnRate * 1.6f, -9f, 9f), Mathf.Min(1f, dt * 8f));
            transform.rotation = Quaternion.Euler(0, yaw, lean);
        }

        float BoostReady()
        {
            int idx = InputController.AbilityIsBoost(0) ? 0 : 1;
            return ps.ready[idx];
        }
    }
}
