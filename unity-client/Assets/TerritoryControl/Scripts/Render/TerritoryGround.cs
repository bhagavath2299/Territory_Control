using UnityEngine;
using UnityEngine.Rendering;

namespace TC
{
    /// <summary>
    /// The playfield: one displaced mesh drawn with the TC/Ground shader.
    /// Ownership from the server is turned into a colour map and a softened height map so conquered land rises with a real edge,
    /// a shadow on the street beside it, and the owner's tint on the rooftops.
    /// </summary>
    public class TerritoryGround : MonoBehaviour
    {
        public float raise = 0.38f;

        MatchState S; MeshFilter mf; MeshRenderer mr; Material mat; Mesh mesh;
        Texture2D landTex, colorTex, heightTex, detailTex;
        Color32[] cbuf; byte[] hA, hB; bool raised; int builtTier = -1;

        const int MW = MatchState.MW, MH = MatchState.MH;

        void Awake()
        {
            mf = gameObject.AddComponent<MeshFilter>();
            mr = gameObject.AddComponent<MeshRenderer>();
            mr.shadowCastingMode = ShadowCastingMode.Off;
            cbuf = new Color32[MW * MH]; hA = new byte[MW * MH]; hB = new byte[MW * MH];
        }

        /// <summary>Menu backdrop: an all-land city with a few sample conquered districts so the look is visible before a match.</summary>
        public MatchState BuildShowcase()
        {
            var s = new MatchState();
            for (int i = 0; i < s.land.Length; i++) s.land[i] = 1;
            s.landCells = s.land.Length;
            for (int k = 0; k < 6; k++) s.disp[k] = k;
            var rnd = new System.Random(77);
            for (int d = 1; d <= 4; d++)
            {
                float cx = 20 + (float)rnd.NextDouble() * 60, cy = 25 + (float)rnd.NextDouble() * 125, r = 8 + (float)rnd.NextDouble() * 9;
                for (int y = 0; y < MH; y++)
                    for (int x = 0; x < MW; x++)
                    {
                        float dx = x / 3f - cx, dy = y / 3f - cy;
                        float rr = r * (1f + 0.18f * Mathf.Sin(Mathf.Atan2(dy, dx) * 3f + d));
                        if (dx * dx + dy * dy < rr * rr) s.own[y * MW + x] = (byte)d;
                    }
            }
            s.seed = 424242;
            Build(s, QualityManager.I);
            return s;
        }

        public void Build(MatchState s, QualityManager q)
        {
            S = s;
            int tier = q != null ? (int)q.Tier : 1;
            raised = q == null || q.Tier == QualityTier.High;
            int ppu = raised ? 8 : 4;

            if (detailTex != null) Destroy(detailTex);
            detailTex = CityTexture.Generate(s.seed, ppu);

            if (landTex == null) { landTex = NewTex(TextureFormat.R8, FilterMode.Bilinear); colorTex = NewTex(TextureFormat.RGBA32, FilterMode.Bilinear); heightTex = NewTex(TextureFormat.R8, FilterMode.Bilinear); }
            var l = new byte[MW * MH];
            for (int i = 0; i < l.Length; i++) l[i] = (byte)(s.land[i] != 0 ? 255 : 0);
            landTex.SetPixelData(l, 0); landTex.Apply(false);

            if (mat == null)
            {
                mat = new Material(GameAssets.I.groundMaterial);
                mr.sharedMaterial = mat;
            }
            mat.SetTexture("_DetailTex", detailTex); mat.SetTexture("_LandTex", landTex);
            mat.SetTexture("_ColorTex", colorTex); mat.SetTexture("_HeightTex", heightTex);
            mat.SetVector("_World", new Vector4(MatchState.WW, MatchState.WH, 0, 0));
            mat.SetVector("_Texel", new Vector4(1f / MW, 1f / MH, 0, 0));
            mat.SetFloat("_Raise", raised ? raise : 0f);
            if (raised) mat.EnableKeyword("TC_RAISE"); else mat.DisableKeyword("TC_RAISE");

            if (mesh == null || builtTier != tier) { BuildMesh(raised ? 3 : 1); builtTier = tier; }
            Refresh();
        }

        static Texture2D NewTex(TextureFormat f, FilterMode fm)
        {
            var t = new Texture2D(MW, MH, f, false, true) { wrapMode = TextureWrapMode.Clamp, filterMode = fm };
            return t;
        }

        void BuildMesh(int perUnit)
        {
            int nx = MatchState.WW * perUnit + 1, nz = MatchState.WH * perUnit + 1;
            var v = new Vector3[nx * nz]; var idx = new int[(nx - 1) * (nz - 1) * 6];
            for (int z = 0; z < nz; z++)
                for (int x = 0; x < nx; x++)
                    v[z * nx + x] = new Vector3((float)x / perUnit, 0f, (float)z / perUnit);
            int k = 0;
            for (int z = 0; z < nz - 1; z++)
                for (int x = 0; x < nx - 1; x++)
                {
                    int a = z * nx + x, b = a + 1, c = a + nx, d = c + 1;
                    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
                }
            if (mesh != null) Destroy(mesh);
            mesh = new Mesh { name = "GroundGrid", indexFormat = IndexFormat.UInt32 };
            mesh.vertices = v; mesh.triangles = idx;
            mesh.bounds = new Bounds(new Vector3(MatchState.WW * 0.5f, 0, MatchState.WH * 0.5f), new Vector3(MatchState.WW, 4f, MatchState.WH));
            mf.sharedMesh = mesh;
        }

        /// <summary>Call after the ownership data changed.</summary>
        public void Refresh()
        {
            if (S == null) return;
            var own = S.own;
            for (int i = 0; i < own.Length; i++)
            {
                byte o = own[i];
                if (o == 0) { cbuf[i] = new Color32(0, 0, 0, 0); hA[i] = 0; continue; }
                var c = S.ColorOf(o);
                cbuf[i] = new Color32((byte)(c.r * 255), (byte)(c.g * 255), (byte)(c.b * 255), 255);
                hA[i] = 255;
            }
            colorTex.SetPixelData(cbuf, 0); colorTex.Apply(false);
            Blur(hA, hB, 2); Blur(hB, hA, 2);          // softened mask = smooth raised edge
            heightTex.SetPixelData(hA, 0); heightTex.Apply(false);
        }

        // separable box blur, radius r, clamped at the borders
        static byte[] tmp;
        static void Blur(byte[] src, byte[] dst, int r)
        {
            if (tmp == null || tmp.Length != src.Length) tmp = new byte[src.Length];
            int w = MW, h = MH, n = 2 * r + 1;
            for (int y = 0; y < h; y++)
            {
                int row = y * w;
                for (int x = 0; x < w; x++)
                {
                    int s = 0;
                    for (int k = -r; k <= r; k++) s += src[row + Mathf.Clamp(x + k, 0, w - 1)];
                    tmp[row + x] = (byte)(s / n);
                }
            }
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    int s = 0;
                    for (int k = -r; k <= r; k++) s += tmp[Mathf.Clamp(y + k, 0, h - 1) * w + x];
                    dst[y * w + x] = (byte)(s / n);
                }
        }

        /// <summary>Surface height at a server position, so cars and trails sit on top of raised land.</summary>
        public float HeightAt(float x, float y)
        {
            if (!raised || hA == null) return 0f;
            int cx = Mathf.Clamp((int)(x * MatchState.MC), 0, MW - 1), cy = Mathf.Clamp((int)(y * MatchState.MC), 0, MH - 1);
            int i = cy * MW + cx;
            if (S == null || S.land[i] == 0) return 0f;
            return hA[i] / 255f * raise;
        }

        void OnDestroy()
        {
            if (detailTex != null) Destroy(detailTex);
            if (landTex != null) Destroy(landTex);
            if (colorTex != null) Destroy(colorTex);
            if (heightTex != null) Destroy(heightTex);
            if (mesh != null) Destroy(mesh);
        }
    }
}
