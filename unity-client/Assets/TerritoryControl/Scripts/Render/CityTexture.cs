using System.Collections.Generic;
using UnityEngine;

namespace TC
{
    /// <summary>
    /// Procedural aerial city map: irregular street grid, sidewalks, rooftops with sun shadows, parks with trees.
    /// Painted in server coordinates (row = server y) so the ground shader can sample it with the same UVs as the ownership data.
    /// Replace or blend with CC0 photo textures (ambientCG / Poly Haven) later; the generator keeps every match different.
    /// </summary>
    public static class CityTexture
    {
        static readonly Color32[] Roofs =
        {
            new Color32(181,96,62,255),  new Color32(189,184,174,255), new Color32(74,127,168,255), new Color32(108,143,94,255),
            new Color32(231,227,218,255), new Color32(154,143,132,255), new Color32(201,139,94,255), new Color32(168,70,56,255)
        };

        struct Road { public float c, w; }

        public static Texture2D Generate(int seed, int ppu)
        {
            int W = MatchState.WW * ppu, H = MatchState.WH * ppu;
            var px = new Color32[W * H];
            var rnd = new System.Random(seed * 7919 + 13);

            // asphalt with grain
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    int g = 74 + (Hash(x, y, seed) & 7);
                    px[y * W + x] = new Color32((byte)g, (byte)g, (byte)(g - 2), 255);
                }

            var rx = Roads(rnd, MatchState.WW);
            var ry = Roads(rnd, MatchState.WH);
            var xe = Edges(rx, MatchState.WW);
            var ye = Edges(ry, MatchState.WH);

            // blocks between roads
            for (int j = 0; j + 1 < ye.Count; j += 2)
                for (int i = 0; i + 1 < xe.Count; i += 2)
                    Block(px, W, H, ppu, rnd, seed, xe[i], ye[j], xe[i + 1], ye[j + 1]);

            // lane markings
            foreach (var r in rx) if (r.w > 2.1f) for (float y = 0; y < MatchState.WH; y += 3f) Rect(px, W, H, ppu, r.c - 0.07f, y, r.c + 0.07f, y + 1.5f, new Color32(214, 190, 90, 255));
            foreach (var r in ry) if (r.w > 2.1f) for (float x = 0; x < MatchState.WW; x += 3f) Rect(px, W, H, ppu, x, r.c - 0.07f, x + 1.5f, r.c + 0.07f, new Color32(214, 190, 90, 255));

            var tex = new Texture2D(W, H, TextureFormat.RGBA32, true, false);
            tex.SetPixels32(px);
            tex.wrapMode = TextureWrapMode.Clamp; tex.filterMode = FilterMode.Bilinear; tex.anisoLevel = 4;
            tex.Apply(true, true);
            return tex;
        }

        static List<Road> Roads(System.Random rnd, float total)
        {
            var l = new List<Road>(); float pos = 4f + (float)rnd.NextDouble() * 6f;
            while (pos < total - 7f)
            {
                bool avenue = rnd.NextDouble() < 0.2;
                l.Add(new Road { c = pos, w = avenue ? 4.2f : 2.2f + (float)rnd.NextDouble() * 0.7f });
                pos += 11f + (float)rnd.NextDouble() * 8f;
            }
            return l;
        }

        // pairs of (start, end) for the blocks between roads, including the map borders
        static List<float> Edges(List<Road> roads, float total)
        {
            var e = new List<float>(); float prev = 0f;
            foreach (var r in roads) { e.Add(prev); e.Add(r.c - r.w * 0.5f); prev = r.c + r.w * 0.5f; }
            e.Add(prev); e.Add(total);
            return e;
        }

        static void Block(Color32[] px, int W, int H, int ppu, System.Random rnd, int seed, float x0, float y0, float x1, float y1)
        {
            if (x1 - x0 < 3f || y1 - y0 < 3f) return;
            double t = rnd.NextDouble();
            var walk = new Color32(184, 181, 172, 255);
            Rect(px, W, H, ppu, x0, y0, x1, y1, walk);
            x0 += 0.55f; y0 += 0.55f; x1 -= 0.55f; y1 -= 0.55f;
            if (t < 0.12)            // park
            {
                Rect(px, W, H, ppu, x0, y0, x1, y1, new Color32(111, 154, 79, 255));
                Rect(px, W, H, ppu, (x0 + x1) * 0.5f - 0.35f, y0, (x0 + x1) * 0.5f + 0.35f, y1, new Color32(196, 184, 150, 255));
                Rect(px, W, H, ppu, x0, (y0 + y1) * 0.5f - 0.35f, x1, (y0 + y1) * 0.5f + 0.35f, new Color32(196, 184, 150, 255));
                int trees = (int)((x1 - x0) * (y1 - y0) / 14f);
                for (int i = 0; i < trees; i++)
                {
                    float cx = x0 + (float)rnd.NextDouble() * (x1 - x0), cy = y0 + (float)rnd.NextDouble() * (y1 - y0), r = 0.7f + (float)rnd.NextDouble() * 0.5f;
                    Disc(px, W, H, ppu, cx + 0.5f, cy + 0.5f, r, new Color32(40, 70, 40, 140), true);
                    Disc(px, W, H, ppu, cx, cy, r, new Color32((byte)(48 + rnd.Next(24)), (byte)(104 + rnd.Next(30)), (byte)(52 + rnd.Next(16)), 255), false);
                }
                return;
            }
            if (t < 0.20)            // plaza
            {
                Rect(px, W, H, ppu, x0, y0, x1, y1, new Color32(205, 198, 184, 255));
                for (float x = x0; x < x1; x += 1.6f) Rect(px, W, H, ppu, x, y0, x + 0.05f, y1, new Color32(176, 170, 156, 255));
                return;
            }
            bool dense = t > 0.78;
            int cols = dense ? 3 + rnd.Next(2) : 1 + rnd.Next(3), rows = dense ? 3 + rnd.Next(2) : 1 + rnd.Next(3);
            float cw = (x1 - x0) / cols, ch = (y1 - y0) / rows, gap = dense ? 0.28f : 0.5f;
            for (int r = 0; r < rows; r++)
                for (int c = 0; c < cols; c++)
                {
                    float bx0 = x0 + c * cw + gap * 0.5f, by0 = y0 + r * ch + gap * 0.5f, bx1 = x0 + (c + 1) * cw - gap * 0.5f, by1 = y0 + (r + 1) * ch - gap * 0.5f;
                    // shadow first (sun from the upper left, so shadows fall to the lower right)
                    Rect(px, W, H, ppu, bx0 + 0.55f, by0 + 0.55f, bx1 + 0.55f, by1 + 0.55f, new Color32(0, 0, 0, 120), true);
                    var roof = Roofs[rnd.Next(Roofs.Length)];
                    float shade = 0.88f + (float)rnd.NextDouble() * 0.22f;
                    var col = new Color32((byte)Mathf.Min(255, roof.r * shade), (byte)Mathf.Min(255, roof.g * shade), (byte)Mathf.Min(255, roof.b * shade), 255);
                    Rect(px, W, H, ppu, bx0, by0, bx1, by1, col);
                    Rect(px, W, H, ppu, bx0, by0, bx1, by0 + 0.12f, new Color32(255, 255, 255, 70), true);     // lit edge
                    int units = (int)((bx1 - bx0) * (by1 - by0) / 6f);
                    for (int u = 0; u < units; u++)                                                              // rooftop clutter
                    {
                        float ux = bx0 + 0.3f + (float)rnd.NextDouble() * Mathf.Max(0.1f, bx1 - bx0 - 0.9f), uy = by0 + 0.3f + (float)rnd.NextDouble() * Mathf.Max(0.1f, by1 - by0 - 0.9f);
                        Rect(px, W, H, ppu, ux, uy, ux + 0.45f, uy + 0.35f, new Color32(90, 92, 96, 255));
                    }
                }
        }

        static int Hash(int x, int y, int s)
        {
            unchecked { int h = x * 374761393 + y * 668265263 + s * 982451653; h = (h ^ (h >> 13)) * 1274126177; return (h ^ (h >> 16)) & 0x7fffffff; }
        }

        static void Rect(Color32[] px, int W, int H, int ppu, float x0, float y0, float x1, float y1, Color32 c, bool blend = false)
        {
            int a0 = Mathf.Max(0, (int)(x0 * ppu)), a1 = Mathf.Min(W, (int)(x1 * ppu)), b0 = Mathf.Max(0, (int)(y0 * ppu)), b1 = Mathf.Min(H, (int)(y1 * ppu));
            for (int y = b0; y < b1; y++)
            {
                int row = y * W;
                for (int x = a0; x < a1; x++)
                {
                    if (!blend) { px[row + x] = c; continue; }
                    var d = px[row + x]; float k = c.a / 255f;
                    px[row + x] = new Color32((byte)(d.r + (c.r - d.r) * k), (byte)(d.g + (c.g - d.g) * k), (byte)(d.b + (c.b - d.b) * k), 255);
                }
            }
        }

        static void Disc(Color32[] px, int W, int H, int ppu, float cx, float cy, float r, Color32 c, bool blend)
        {
            int a0 = Mathf.Max(0, (int)((cx - r) * ppu)), a1 = Mathf.Min(W - 1, (int)((cx + r) * ppu)), b0 = Mathf.Max(0, (int)((cy - r) * ppu)), b1 = Mathf.Min(H - 1, (int)((cy + r) * ppu));
            float r2 = r * r * ppu * ppu, pcx = cx * ppu, pcy = cy * ppu;
            for (int y = b0; y <= b1; y++)
                for (int x = a0; x <= a1; x++)
                {
                    float dx = x - pcx, dy = y - pcy;
                    if (dx * dx + dy * dy > r2) continue;
                    if (!blend) { px[y * W + x] = c; continue; }
                    var d = px[y * W + x]; float k = c.a / 255f;
                    px[y * W + x] = new Color32((byte)(d.r + (c.r - d.r) * k), (byte)(d.g + (c.g - d.g) * k), (byte)(d.b + (c.b - d.b) * k), 255);
                }
        }
    }
}
