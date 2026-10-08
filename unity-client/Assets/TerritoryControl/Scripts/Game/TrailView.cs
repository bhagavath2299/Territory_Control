using UnityEngine;

namespace TC
{
    /// <summary>Glowing trail behind a car while it is outside its own land. Points come from the server; the last point follows the car.</summary>
    public class TrailView : MonoBehaviour
    {
        MatchState S; int slot; CarView car; TerritoryGround ground; LineRenderer lr; Vector3[] buf = new Vector3[512];

        public void Init(MatchState s, int slotId, CarView c, TerritoryGround g)
        {
            S = s; slot = slotId; car = c; ground = g;
            var go = new GameObject("Trail"); go.transform.SetParent(transform, false);
            lr = go.AddComponent<LineRenderer>();
            lr.useWorldSpace = true; lr.numCapVertices = 4; lr.numCornerVertices = 3;
            lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            float w = S.trailStyle[slot] == "fire" ? 0.5f : S.trailStyle[slot] == "neon" ? 0.34f : 0.42f;
            lr.widthMultiplier = w;
            var m = new Material(GameAssets.I.trailMaterial);
            Color c = car.Color;
            if (S.trailStyle[slot] == "fire") c = Color.Lerp(c, new Color(1f, 0.55f, 0.1f), 0.6f);
            c *= 1.8f; c.a = 1f;                       // brighter than 1 so bloom picks it up
            m.color = c; m.SetColor("_BaseColor", c);
            lr.sharedMaterial = m;
            lr.positionCount = 0;
        }

        void LateUpdate()
        {
            var ps = S.p[slot];
            if (!S.active || !ps.alive || ps.trail.Count < 2) { if (lr.positionCount != 0) lr.positionCount = 0; return; }
            int n = ps.trail.Count;
            int total = Mathf.Min(n + 1, buf.Length);
            int start = n + 1 > buf.Length ? n + 1 - buf.Length : 0;
            for (int i = 0; i < total - 1; i++)
            {
                var p = ps.trail[start + i];
                buf[i] = new Vector3(p.x, ground.HeightAt(p.x, p.y) + 0.06f, MatchState.WH - p.y);
            }
            var tp = car.WorldPos;
            buf[total - 1] = new Vector3(tp.x, tp.y + 0.06f, tp.z);
            lr.positionCount = total;
            lr.SetPositions(buf);
        }
    }
}
