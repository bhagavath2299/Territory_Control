using UnityEngine;

namespace TC
{
    /// <summary>Top-down chase camera with a slight tilt. Zooms out as your land grows, like the browser game.</summary>
    [RequireComponent(typeof(Camera))]
    public class CameraRig : MonoBehaviour
    {
        public float pitch = 72f;
        public float minView = 24f;     // world units visible vertically when you are small
        public float maxView = 44f;
        public float carScreenY = 0.38f;   // car sits in the lower part of the screen so you see ahead

        Camera cam; MatchState S; CarView target;
        Vector3 focus; float view;

        void Awake() { cam = GetComponent<Camera>(); view = minView; }

        public void Follow(MatchState s, CarView t)
        {
            S = s; target = t;
            if (t != null) focus = new Vector3(MatchState.WW * 0.5f, 0, MatchState.WH * 0.5f);
            view = minView;
        }

        void LateUpdate()
        {
            if (S == null || !S.active)
            {
                // menu showreel: slow drift over the city
                float t = Time.time * 0.05f;
                focus = new Vector3(MatchState.WW * 0.5f + Mathf.Sin(t) * 18f, 0, MatchState.WH * 0.5f + Mathf.Cos(t * 0.7f) * 50f);
                Place(46f);
                return;
            }
            if (target != null && target.Visible)
            {
                Vector3 p = target.WorldPos;
                float k = 1f - Mathf.Exp(-Time.deltaTime * 6f);
                focus = Vector3.Lerp(focus, new Vector3(p.x, 0, p.z), k);
            }
            float pct = S.Percent(S.you);
            float wantView = Mathf.Lerp(minView, maxView, Mathf.Clamp01(pct / 35f));
            view = Mathf.Lerp(view, wantView, 1f - Mathf.Exp(-Time.deltaTime * 1.5f));
            Place(view);
        }

        void Place(float visibleHeight)
        {
            float fov = cam.fieldOfView * Mathf.Deg2Rad;
            float dist = (visibleHeight * 0.5f) / Mathf.Tan(fov * 0.5f);
            cam.transform.rotation = Quaternion.Euler(pitch, 0, 0);
            // shift focus so the car sits at carScreenY from the bottom
            float shift = (0.5f - carScreenY) * visibleHeight;
            Vector3 aim = focus + new Vector3(0, 0, shift);
            cam.transform.position = aim - cam.transform.forward * dist;
        }
    }
}
