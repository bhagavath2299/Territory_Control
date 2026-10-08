#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace TC.EditorTools
{
    /// <summary>
    /// Territory > Create Game Scene builds everything the game needs in one click: materials, post-processing profile,
    /// the Main scene with camera, sun and game objects, build settings and mobile player settings.
    /// Run it once after importing the folder into a Unity 6 URP project.
    /// </summary>
    public static class TerritoryBootstrap
    {
        const string Root = "Assets/TerritoryControl";

        [MenuItem("Territory/Create Game Scene")]
        public static void CreateScene()
        {
            Directory.CreateDirectory(Root + "/Materials");
            Directory.CreateDirectory(Root + "/Scenes");
            Directory.CreateDirectory(Root + "/Settings");

            var ground = Mat("Ground", "TC/Ground", null);
            var body = Mat("CarBody", "Universal Render Pipeline/Lit", m => { m.SetFloat("_Metallic", 0.55f); m.SetFloat("_Smoothness", 0.85f); });
            var dark = Mat("CarDark", "Universal Render Pipeline/Lit", m => { m.SetColor("_BaseColor", new Color(0.06f, 0.06f, 0.07f)); m.SetFloat("_Smoothness", 0.3f); });
            var glass = Mat("CarGlass", "Universal Render Pipeline/Lit", m => { m.SetColor("_BaseColor", new Color(0.08f, 0.12f, 0.18f)); m.SetFloat("_Smoothness", 0.95f); m.SetFloat("_Metallic", 0.4f); });
            var trail = Mat("Trail", "Universal Render Pipeline/Unlit", m => m.SetColor("_BaseColor", Color.white));
            var light = Mat("Lights", "Universal Render Pipeline/Unlit", m => m.SetColor("_BaseColor", new Color(3.2f, 3.0f, 2.2f)));

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // camera
            var camGo = new GameObject("Main Camera") { tag = "MainCamera" };
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.07f, 0.26f, 0.40f);
            cam.fieldOfView = 38f; cam.nearClipPlane = 0.5f; cam.farClipPlane = 400f;
            camGo.AddComponent<AudioListener>();
            var cd = camGo.AddComponent<UniversalAdditionalCameraData>(); cd.renderPostProcessing = true;
            var rig = camGo.AddComponent<CameraRig>();

            // sun: low and warm, shadows fall to the lower right like the baked rooftop shadows
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional; sun.color = new Color(1f, 0.93f, 0.82f); sun.intensity = 1.5f;
            sun.shadows = LightShadows.Soft; sun.shadowStrength = 0.85f;
            sunGo.transform.rotation = Quaternion.Euler(52f, -38f, 0f);
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.62f, 0.72f, 0.88f);
            RenderSettings.ambientEquatorColor = new Color(0.52f, 0.52f, 0.54f);
            RenderSettings.ambientGroundColor = new Color(0.30f, 0.27f, 0.24f);

            // post-processing
            var volGo = new GameObject("Post Volume");
            var vol = volGo.AddComponent<Volume>(); vol.isGlobal = true; vol.sharedProfile = MakeProfile();

            // game objects
            var root = new GameObject("GameRoot");
            var assets = root.AddComponent<GameAssets>();
            assets.groundMaterial = ground; assets.carBodyMaterial = body; assets.carDarkMaterial = dark;
            assets.glassMaterial = glass; assets.trailMaterial = trail; assets.lightMaterial = light;
            root.AddComponent<NetClient>();
            root.AddComponent<QualityManager>();
            root.AddComponent<InputController>();
            var gr = new GameObject("Ground"); gr.transform.SetParent(root.transform, false);
            var tg = gr.AddComponent<TerritoryGround>();
            var mc = root.AddComponent<MatchController>(); mc.ground = tg; mc.cameraRig = rig;
            root.AddComponent<HudUI>();

            string path = Root + "/Scenes/Main.unity";
            EditorSceneManager.SaveScene(scene, path);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(path, true) };
            ConfigurePlayer();
            AssetDatabase.SaveAssets();
            Debug.Log("Territory Control: scene created at " + path + ". Press Play to test, or File > Build Profiles to build for iOS or Android.");
        }

        static Material Mat(string name, string shader, System.Action<Material> setup)
        {
            string p = Root + "/Materials/" + name + ".mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(p);
            if (m == null) { m = new Material(Shader.Find(shader)); AssetDatabase.CreateAsset(m, p); }
            if (setup != null) setup(m);
            EditorUtility.SetDirty(m);
            return m;
        }

        static VolumeProfile MakeProfile()
        {
            string p = Root + "/Settings/PostProfile.asset";
            var old = AssetDatabase.LoadAssetAtPath<VolumeProfile>(p);
            if (old != null) AssetDatabase.DeleteAsset(p);
            var prof = ScriptableObject.CreateInstance<VolumeProfile>();
            AssetDatabase.CreateAsset(prof, p);

            var bloom = prof.Add<Bloom>(true); bloom.threshold.Override(1.0f); bloom.intensity.Override(0.7f); bloom.scatter.Override(0.6f);
            var vig = prof.Add<Vignette>(true); vig.intensity.Override(0.28f); vig.smoothness.Override(0.5f);
            var tm = prof.Add<Tonemapping>(true); tm.mode.Override(TonemappingMode.ACES);
            var ca = prof.Add<ColorAdjustments>(true); ca.contrast.Override(12f); ca.saturation.Override(10f); ca.postExposure.Override(0.15f);
            foreach (var c in prof.components) AssetDatabase.AddObjectToAsset(c, prof);
            EditorUtility.SetDirty(prof);
            return prof;
        }

        static void ConfigurePlayer()
        {
            PlayerSettings.productName = "Territory Control";
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.allowedAutorotateToLandscapeLeft = false; PlayerSettings.allowedAutorotateToLandscapeRight = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            // Android
            PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Android, UnityEditor.Build.ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel24;
            PlayerSettings.SetManagedStrippingLevel(UnityEditor.Build.NamedBuildTarget.Android, ManagedStrippingLevel.Medium);
            // iOS
            PlayerSettings.iOS.targetOSVersionString = "15.0";
            PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.iOS, UnityEditor.Build.ScriptingImplementation.IL2CPP);
            // The application identifier must be yours and unique. Set it in Project Settings > Player before publishing.
        }
    }
}
#endif
