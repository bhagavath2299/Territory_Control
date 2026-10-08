Shader "TC/Ground"
{
    Properties
    {
        _DetailTex ("City map", 2D) = "gray" {}
        _LandTex ("Land mask", 2D) = "white" {}
        _ColorTex ("Owner colour", 2D) = "black" {}
        _HeightTex ("Raised height", 2D) = "black" {}
        _World ("World size", Vector) = (101, 177, 0, 0)
        _Texel ("Ownership texel", Vector) = (0.0033, 0.0019, 0, 0)
        _Raise ("Raise height", Float) = 0.38
        _WaterDeep ("Water deep", Color) = (0.07, 0.26, 0.40, 1)
        _WaterShallow ("Water shallow", Color) = (0.16, 0.52, 0.62, 1)
        _Sand ("Sand", Color) = (0.80, 0.72, 0.52, 1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            Cull Back ZWrite On

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ TC_RAISE
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile_fragment _ _SHADOWS_SOFT

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            TEXTURE2D(_DetailTex); SAMPLER(sampler_DetailTex);
            TEXTURE2D(_LandTex);   SAMPLER(sampler_LandTex);
            TEXTURE2D(_ColorTex);  SAMPLER(sampler_ColorTex);
            TEXTURE2D(_HeightTex); SAMPLER(sampler_HeightTex);

            CBUFFER_START(UnityPerMaterial)
                float4 _World;
                float4 _Texel;
                float _Raise;
                half4 _WaterDeep;
                half4 _WaterShallow;
                half4 _Sand;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; };
            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float2 uv : TEXCOORD1;
            };

            // texture rows follow the server's y (down); world z runs the other way
            float2 WorldToUV(float3 p) { return float2(p.x / _World.x, (_World.y - p.z) / _World.y); }

            Varyings vert(Attributes i)
            {
                Varyings o;
                float3 p = i.positionOS.xyz;
                float2 uv = WorldToUV(p);
                #ifdef TC_RAISE
                    float h = SAMPLE_TEXTURE2D_LOD(_HeightTex, sampler_HeightTex, uv, 0).r;
                    float land = SAMPLE_TEXTURE2D_LOD(_LandTex, sampler_LandTex, uv, 0).r;
                    p.y = h * _Raise * step(0.5, land);
                #endif
                o.positionWS = TransformObjectToWorld(p);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                o.uv = uv;
                return o;
            }

            half4 frag(Varyings i) : SV_Target
            {
                float2 uv = i.uv;
                float2 t = _Texel.xy;
                float land = SAMPLE_TEXTURE2D(_LandTex, sampler_LandTex, uv).r;
                float h = SAMPLE_TEXTURE2D(_HeightTex, sampler_HeightTex, uv).r;

                // surface normal from the height map (only where land is raised)
                float hl = SAMPLE_TEXTURE2D(_HeightTex, sampler_HeightTex, uv - float2(t.x * 2, 0)).r;
                float hr = SAMPLE_TEXTURE2D(_HeightTex, sampler_HeightTex, uv + float2(t.x * 2, 0)).r;
                float hd = SAMPLE_TEXTURE2D(_HeightTex, sampler_HeightTex, uv - float2(0, t.y * 2)).r;
                float hu = SAMPLE_TEXTURE2D(_HeightTex, sampler_HeightTex, uv + float2(0, t.y * 2)).r;
                float span = 4.0 * t.x * _World.x;
                float dhdx = (hr - hl) * _Raise / span;
                float dhdz = (hd - hu) * _Raise / span;
                #ifndef TC_RAISE
                    dhdx = 0; dhdz = 0;
                #endif
                float3 N = normalize(float3(-dhdx, 1.0, -dhdz));

                Light L = GetMainLight(TransformWorldToShadowCoord(i.positionWS));
                float ndl = saturate(dot(N, L.direction));

                // soft shadow cast by raised land onto the street beside it
                float occ = 0;
                #ifdef TC_RAISE
                    float2 ld = normalize(L.direction.xz + 1e-4);
                    float2 stp = float2(ld.x * t.x, -ld.y * t.y) * 3.0;
                    [unroll] for (int k = 1; k <= 3; k++)
                    {
                        float hh = SAMPLE_TEXTURE2D(_HeightTex, sampler_HeightTex, uv + stp * k).r;
                        occ = max(occ, hh - h * 0.9 - (k - 1) * 0.12);
                    }
                    occ = saturate(occ);
                #endif
                float sh = L.shadowAttenuation * (1.0 - 0.5 * occ);

                half3 city = SAMPLE_TEXTURE2D(_DetailTex, sampler_DetailTex, uv).rgb;
                half4 oc = SAMPLE_TEXTURE2D(_ColorTex, sampler_ColorTex, uv);
                half3 ownerCol = oc.rgb / max(oc.a, 0.001);
                half cover = smoothstep(0.35, 0.65, h);

                // sand along the shore
                half3 albedo = lerp(_Sand.rgb, city, smoothstep(0.50, 0.80, land));
                // conquered rooftops take the owner's colour; steep edges show a darker wall
                half3 owned = city * 0.30 + ownerCol * 0.80;
                half3 wall = ownerCol * 0.45;
                half side = saturate((1.0 - N.y) * 4.0);
                half3 landCol = lerp(albedo, lerp(owned, wall, side), cover);

                half3 amb = SampleSH(N);
                half3 lit = landCol * (amb * 0.9 + L.color * ndl * sh * 1.15);

                // water
                float ripple = sin(uv.x * 420.0 + _Time.y * 1.3) * sin(uv.y * 300.0 - _Time.y * 0.9) * 0.5 + 0.5;
                half3 water = lerp(_WaterDeep.rgb, _WaterShallow.rgb, saturate(ripple * 0.35 + (0.5 - land) * 1.2));
                water *= (amb * 0.8 + L.color * 0.45);
                float foam = smoothstep(0.30, 0.48, land) * (1.0 - smoothstep(0.48, 0.58, land));

                half3 col = lerp(water, lit, smoothstep(0.46, 0.54, land));
                col += foam * 0.35;
                return half4(col, 1);
            }
            ENDHLSL
        }
    }
    Fallback Off
}
