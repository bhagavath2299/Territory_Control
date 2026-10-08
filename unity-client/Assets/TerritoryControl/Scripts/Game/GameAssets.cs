using UnityEngine;

namespace TC
{
    /// <summary>
    /// Holds references to materials and optional art so they survive build stripping.
    /// Filled automatically by Territory > Create Game Scene. Drop CC0 car prefabs in the arrays to replace the placeholder cars.
    /// </summary>
    public class GameAssets : MonoBehaviour
    {
        public static GameAssets I;
        public Material groundMaterial;
        public Material carBodyMaterial;
        public Material carDarkMaterial;
        public Material glassMaterial;
        public Material trailMaterial;
        public Material lightMaterial;

        [Header("Optional art (CC0 packs). Index: 0 sport, 1 muscle, 2 formula")]
        public GameObject[] carPrefabs = new GameObject[3];

        void Awake() { I = this; }

        public GameObject CarPrefab(string skin)
        {
            int i = skin == "muscle" ? 1 : skin == "f1" ? 2 : 0;
            return carPrefabs != null && i < carPrefabs.Length ? carPrefabs[i] : null;
        }
    }
}
