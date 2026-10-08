using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace TC
{
    public enum QualityTier { Low = 0, High = 1 }

    /// <summary>
    /// Two quality tiers. Low targets 4 GB mid-range Android phones: no real-time shadows, no raised-land vertex displacement,
    /// smaller city texture, 30 fps. High targets recent iPhones and strong Android: shadows, bloom, vignette, 60 fps.
    /// Auto picks a tier from the device and drops to Low if the frame rate stays poor.
    /// </summary>
    public class QualityManager : MonoBehaviour
    {
        public static QualityManager I;
        public QualityTier Tier { get; private set; } = QualityTier.High;
        public bool Auto { get; private set; } = true;

        Volume volume; Light sun; float fpsAcc; int fpsN; float checkT;

        void Awake()
        {
            I = this;
            Auto = PlayerPrefs.GetInt("tc-q-auto", 1) == 1;
            Tier = Auto ? Detect() : (PlayerPrefs.GetInt("tc-q", 1) == 0 ? QualityTier.Low : QualityTier.High);
        }

        void Start()
        {
            var sunGo = GameObject.Find("Sun"); if (sunGo != null) sun = sunGo.GetComponent<Light>();
            var vGo = GameObject.Find("Post Volume"); if (vGo != null) volume = vGo.GetComponent<Volume>();
            Apply();
        }

        static QualityTier Detect()
        {
            // under ~5 GB of RAM or a weak GPU: Low
            if (SystemInfo.systemMemorySize < 5000 || SystemInfo.graphicsMemorySize < 1500 || SystemInfo.processorCount <= 4) return QualityTier.Low;
            return QualityTier.High;
        }

        public void SetTier(QualityTier t, bool auto)
        {
            Auto = auto; Tier = auto ? Detect() : t;
            PlayerPrefs.SetInt("tc-q-auto", auto ? 1 : 0); PlayerPrefs.SetInt("tc-q", (int)Tier);
            Apply();
            var g = FindFirstObjectByType<TerritoryGround>();
            var mc = MatchController.I;
            if (g != null && mc != null && mc.S.active) g.Build(mc.S, this);
        }

        void Apply()
        {
            bool hi = Tier == QualityTier.High;
            Application.targetFrameRate = hi ? 60 : 30;
            QualitySettings.vSyncCount = 0;
            var urp = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
            if (urp != null)
            {
                urp.renderScale = hi ? 1.0f : 0.8f;
                urp.msaaSampleCount = hi ? 4 : 1;
                urp.shadowDistance = hi ? 110f : 0f;
                urp.shadowCascadeCount = hi ? 2 : 1;
            }
            if (sun != null) sun.shadows = hi ? LightShadows.Soft : LightShadows.None;
            if (volume != null) volume.enabled = hi;
            var cam = Camera.main;
            if (cam != null) { var d = cam.GetUniversalAdditionalCameraData(); d.renderPostProcessing = hi; }
        }

        // if the game cannot hold a steady frame rate on High, step down once
        void Update()
        {
            if (!Auto || Tier == QualityTier.Low) return;
            var mc = MatchController.I;
            if (mc == null || mc.phase != Phase.Playing) { fpsAcc = 0; fpsN = 0; checkT = 0; return; }
            checkT += Time.unscaledDeltaTime; fpsAcc += Time.unscaledDeltaTime; fpsN++;
            if (checkT > 6f)
            {
                float fps = fpsN / Mathf.Max(0.001f, fpsAcc);
                if (fps < 38f)
                {
                    Tier = QualityTier.Low; PlayerPrefs.SetInt("tc-q", 0); Apply();
                    var g = FindFirstObjectByType<TerritoryGround>();
                    if (g != null && mc.S.active) g.Build(mc.S, this);
                }
                fpsAcc = 0; fpsN = 0; checkT = 0;
            }
        }
    }
}
