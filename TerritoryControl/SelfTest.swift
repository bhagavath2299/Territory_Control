#if SELFTEST
import UIKit
import WebKit

/// Simulator self-test. It is compiled only into the CI test build (Swift flag SELFTEST); the app you install
/// contains none of it.
///
/// Launched with `-selftest`, it plays through the game the way a player would: boot screen, menu, a match
/// against bots in portrait, then landscape, pause and resume, back to portrait, and on to the results screen.
/// At each step it writes Documents/selftest/state.txt and waits until the CI script has taken a screenshot
/// and written the step number to ack.txt. Page errors, timings and frame counts go to report.json.
///
/// Launched with `-selftest-persist` (a second launch), it checks that what the first run saved is still there.
@MainActor
final class SelfTest: NSObject, WKScriptMessageHandler {
    static let shared = SelfTest()

    private weak var controller: GameViewController?
    private let dir: URL
    private let started = Date()
    private var stepNumber = 0
    private var steps: [[String: Any]] = []
    private var environment: [String: Any] = [:]
    private var pageErrors: [String] = []
    private var consoleErrors: [String] = []
    private var consoleWarnings: [String] = []
    private var resourceErrors: [String] = []
    private var notes: [String] = []

    private override init() {
        dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("selftest", isDirectory: true)
        super.init()
    }

    private static var mode: String? {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-selftest") { return "run" }
        if args.contains("-selftest-persist") { return "persist" }
        return nil
    }

    // Reports page errors and counts animation frames from the very start of the page.
    private static let pageScript = #"""
    (function () {
      var h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.tcSelfTest;
      if (!h) return;
      function send(kind, text) { try { h.postMessage({ kind: kind, text: String(text).slice(0, 1500) }); } catch (e) {} }
      window.addEventListener('error', function (e) {
        if (e && e.target && e.target !== window && e.target.tagName) {
          send('resource', e.target.tagName + ' ' + String(e.target.src || e.target.href || '').slice(0, 120));
          return;
        }
        send('error', (e.message || 'error') + ' at ' + (e.filename || '') + ':' + (e.lineno || 0) + ':' + (e.colno || 0) +
          (e.error && e.error.stack ? ' | ' + e.error.stack : ''));
      }, true);
      window.addEventListener('unhandledrejection', function (e) {
        var r = e.reason;
        send('error', 'unhandled rejection: ' + (r && (r.stack || r.message) || r));
      });
      ['error', 'warn'].forEach(function (k) {
        var orig = console[k];
        console[k] = function () {
          try { send('console.' + k, Array.prototype.map.call(arguments, function (a) { return a && a.stack ? a.stack : String(a); }).join(' ')); } catch (e) {}
          return orig.apply(console, arguments);
        };
      });
      // GPU programs the page builds, counted by what the game was doing (loading, menu, play, over): after loading there should be none
      window.__stProg = {};
      [window.WebGL2RenderingContext, window.WebGLRenderingContext].forEach(function (C) {
        if (!C || !C.prototype.linkProgram) return;
        var link = C.prototype.linkProgram;
        C.prototype.linkProgram = function (p) {
          try {
            var s = (typeof BOOTED !== 'undefined' && BOOTED) ? (typeof state !== 'undefined' ? state : '?') : 'loading';
            window.__stProg[s] = (window.__stProg[s] || 0) + 1;
          } catch (e) {}
          return link.call(this, p);
        };
      });
      window.__stFrames = 0;
      // the longest gaps between frames (ms), to find stalls
      window.__stGaps = [];
      var lastT = 0;
      (function tick(t) {
        window.__stFrames++;
        if (lastT && t - lastT > 120) { window.__stGaps.push([Math.round(t), Math.round(t - lastT)]); if (window.__stGaps.length > 40) window.__stGaps.shift(); }
        lastT = t || 0;
        requestAnimationFrame(tick);
      })(0);
      // While a screenshot is taken the page's animation frames are held back, so the picture shows
      // exactly this step and the simulator is not busy drawing (screenshots of a busy simulator take minutes).
      var raf = window.requestAnimationFrame.bind(window), held = [];
      window.__stHold = false;
      window.requestAnimationFrame = function (cb) { if (window.__stHold) { held.push(cb); return 0; } return raf(cb); };
      window.__stRelease = function () {
        window.__stHold = false;
        lastT = 0;  // the pause for the screenshot is not a slow frame
        var h = held; held = [];
        for (var i = 0; i < h.length; i++) raf(h[i]);
        return h.length;
      };
    })();
    """#

    // What the game shows at a step (read from the game's own variables).
    private static let pageState = #"""
    (function () {
      var g = function (f) { try { return f(); } catch (e) { return null; } };
      var el = function (id) { return document.getElementById(id) || {}; };
      return {
        state: g(function () { return state; }), screen: g(function () { return scr; }),
        paused: g(function () { return PAUSED; }), phone: g(function () { return PHONE; }),
        width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio,
        safeArea: g(function () { return SAFE; }), webgl: g(function () { return !!GFX.ok; }),
        envSafeArea: g(function () {
          var d = document.createElement('div');
          d.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
          document.documentElement.appendChild(d);
          var s = getComputedStyle(d), r = { t: parseFloat(s.paddingTop), r: parseFloat(s.paddingRight), b: parseFloat(s.paddingBottom), l: parseFloat(s.paddingLeft) };
          d.remove();
          return r;
        }),
        quality: g(function () { return QNAME; }), scale: g(function () { return GFX.scale; }), refreshHz: g(function () { return QC.hz; }),
        drawCalls: g(function () { return GFX.stats.calls; }), frames: window.__stFrames,
        fpsText: String(el('fps').textContent || '').slice(0, 200), overlay: el('ov').className || '',
        card: String(el('card').innerText || '').replace(/\s+/g, ' ').slice(0, 200),
        timings: window.__stT || null, frameGaps: (window.__stGaps || []).slice(-12), programs: window.__stProg || null
      };
    })()
    """#

    // Wraps the game's heavy functions with timers (count, total and longest call, ms), read back with each step.
    private static let timerScript = #"""
    (function () {
      window.__stT = {}; window.__stOrig = {};
      ['localMatch', 'MPS', 'genMap', 'buildIsland', 'gwBuild', 'carBuild', 'rebuildLand', 'miniPaint', 'gwMask', 'gwScar', 'localFrame', 'frame3d', 'drawHUD', 'draw', 'STEPF', 'capture',
       'gwFrame', 'carsFrame', 'trailsFrame', 'particlesFrame', 'gfxRender']
        .forEach(function (n) {
          var f = window[n]; if (typeof f !== 'function') return;
          window.__stOrig[n] = f;
          window[n] = function () {
            var t = performance.now();
            try { return f.apply(this, arguments); } finally {
              var d = performance.now() - t, s = window.__stT[n] || (window.__stT[n] = { n: 0, ms: 0, max: 0 });
              s.n++; s.ms = Math.round((s.ms + d) * 10) / 10; if (d > s.max) s.max = Math.round(d * 10) / 10;
            }
          };
        });
      return 1;
    })()
    """#

    // What the picture costs, measured in the paused match. First real frames per second: as it is, with the trail and
    // spark buffers sent whole every frame, without the HUD layer, without the 3D layer. Then the game loop is stopped
    // and the 3D picture is drawn on demand and waited for (a 1-pixel read), ms per picture, with parts left out or the
    // floor's shader cut down; also the land picture's update after a capture. Runs in the background; the result
    // lands in window.__stGPU.
    private static let renderCostScript = #"""
    (function () {
      window.__stGPU = null;
      var out = { fps: {}, ms: {}, notes: [] };
      var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      var frames = function (secs) {
        return new Promise(function (res) {
          var n = 0, t0 = performance.now();
          (function f() { n++; if (performance.now() - t0 < secs * 1000) requestAnimationFrame(f); else res(Math.round(n / secs * 10) / 10); })();
        });
      };
      var render = (window.__stOrig && window.__stOrig.gfxRender) || gfxRender;
      (async function () {
        var R = GFX.R, gl = R.getContext(), px = new Uint8Array(4), c3 = R.domElement, hud = document.getElementById('cv');
        try {
          out.canvas = c3.width + 'x' + c3.height; out.tier = QNAME; out.scale = GFX.scale;
          out.trailPoints = (TR3.pool || []).reduce(function (s, m) { return s + (m && m.grp.visible ? m.g.drawRange.count / 3 + 2 : 0); }, 0);
          out.fps.paused = await frames(3);
          TR3.part = 0; PT.part = 0; await wait(250); out.fps.fullUploads = await frames(3); TR3.part = 1; PT.part = 1;
          hud.style.visibility = 'hidden'; await wait(250); out.fps.noHud = await frames(3); hud.style.visibility = '';
          c3.style.visibility = 'hidden'; await wait(250); out.fps.no3d = await frames(3); c3.style.visibility = '';
          await wait(250);
        } catch (e) { out.notes.push('frames: ' + e); }
        READY = 0; await wait(300);
        var run = function () {
          render(GFX.S, GFX.cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          var t = performance.now();
          for (var i = 0; i < 5; i++) { render(GFX.S, GFX.cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
          return Math.round((performance.now() - t) / 5 * 10) / 10;
        };
        var hide = function (list) { var keep = list.filter(function (o) { return o; }).map(function (o) { return [o, o.visible]; }); keep.forEach(function (k) { k[0].visible = false; }); return function () { keep.forEach(function (k) { k[0].visible = k[1]; }); }; };
        var step = async function (name, f) { try { out.ms[name] = f(); } catch (e) { out.notes.push(name + ': ' + e); } await wait(60); };
        var without = function (list) { return function () { var back = hide(list); try { return run(); } finally { back(); } }; };
        var floorWith = function (fs, name) {
          return function () {
            if (fs === GW.floor.material.fragmentShader) { out.notes.push(name + ': shader text not found'); return null; }
            var fm = GW.floor.material, m = new THREE.ShaderMaterial({ uniforms: GW.u, extensions: { derivatives: true }, vertexShader: fm.vertexShader, fragmentShader: fs });
            GW.floor.material = m; try { return run(); } finally { GW.floor.material = fm; m.dispose(); }
          };
        };
        try {
          var src = GW.floor.material.fragmentShader;
          var cars = (CARI || []).filter(function (c) { return c; }).map(function (c) { return c.root; });
          var trails = (TR3.pool || []).map(function (m) { return m && m.grp; });
          var sparks = [PT.A && PT.A.o, PT.N && PT.N.o].concat(RG3.pool || [], RG3.sc || []);
          await step('all', run);
          await step('noFloor', without([GW.floor]));
          await step('floorFlat', floorWith('void main(){gl_FragColor=vec4(.003,.004,.01,1.);}', 'floorFlat'));
          await step('floorNoLand', floorWith(src.replace('if(mB.g>.01){', 'if(false){'), 'floorNoLand'));
          await step('floorNoDeriv', floorWith(src.replace('vec4 dxA=dFdx(mA),dyA=dFdy(mA);vec2 dB=vec2(dFdx(mB.x),dFdy(mB.x));', 'vec4 dxA=vec4(0.),dyA=vec4(0.);vec2 dB=vec2(0.);')
            .replace('float dOwn=(c-.5)/max(length(gc),1e-5)*pxu;', 'float dOwn=(c-.5)*1.33;'), 'floorNoDeriv'));
          await step('floorNoMath', floorWith(src.replace('float sweep=pow(.5+.5*sin((wp.x*.55+wp.y*.35)*.3-uTime*1.4),24.);', 'float sweep=0.;')
            .replace('inner=exp(-max(dOwn,0.)*1.1)*own;', 'inner=0.;'), 'floorNoMath'));
          await step('floorNoGrid', floorWith(src.replace('float gMaj=gridL(wp,4.,.6),gMin=gridL(wp,1.,.45)*clamp(1.5-pxu*7.,0.,1.);', 'float gMaj=0.,gMin=0.;'), 'floorNoGrid'));
          await step('noPads', without(GW.pads));
          await step('noCars', without(cars));
          await step('noTrails', without(trails));
          await step('noSparks', without(sparks));
          await step('floorOnly', without(GFX.S.children.filter(function (o) { return o !== GW.floor; })));
          await step('nothing', without(GFX.S.children.slice()));
          // the land picture redrawn as after a capture: the land map sent to the GPU and smoothed into coverage (two passes)
          var mask = (window.__stOrig && window.__stOrig.gwMask) || gwMask;
          await step('landUpdate', function () {
            var t = performance.now();
            for (var i = 0; i < 5; i++) { GW.texOwn.needsUpdate = true; GW.maskDirty = 1; mask(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
            return Math.round((performance.now() - t) / 5 * 10) / 10;
          });
          var sc0 = GFX.scale; GFX.scale = .6; fit(); await wait(100);
          await step('allAt60pct', run);
          GFX.scale = sc0; fit(); await wait(100);
        } catch (e) { out.notes.push('render: ' + e); }
        READY = 1;
        window.__stGPU = out;
      })();
      return 1;
    })()
    """#

    private static let environmentProbe = #"""
    (function () {
      var gl = null;
      try {
        var c = document.createElement('canvas').getContext('webgl2');
        if (c) { var d = c.getExtension('WEBGL_debug_renderer_info'); gl = d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER); }
      } catch (e) { gl = 'error: ' + e; }
      var ls = null;
      try { localStorage.setItem('st-ls', 'ok'); ls = localStorage.getItem('st-ls'); } catch (e) { ls = 'error: ' + e; }
      var meta = document.querySelector('meta[name=tc-native-source]');
      return {
        href: location.href, userAgent: navigator.userAgent, secureContext: window.isSecureContext,
        serviceWorkerApi: 'serviceWorker' in navigator, vibrateBridge: typeof navigator.vibrate === 'function',
        wakeLockApi: 'wakeLock' in navigator, webgl2Renderer: gl, localStorage: ls,
        cores: navigator.hardwareConcurrency || null, startTier: (function () { try { return tierGuess(); } catch (e) { return null; } })(),
        webSource: meta ? meta.content : null, gameVersion: (function () { try { return VER; } catch (e) { return null; } })()
      };
    })()
    """#

    static func install(in config: WKWebViewConfiguration) {
        guard mode != nil else { return }
        config.userContentController.addUserScript(
            WKUserScript(source: pageScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController.add(shared, name: "tcSelfTest")
    }

    func start(controller: GameViewController) {
        guard let mode = Self.mode else { return }
        self.controller = controller
        if mode == "run" { try? FileManager.default.removeItem(at: dir) }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        Task { @MainActor in
            if mode == "run" { await self.run() } else { await self.persistCheck() }
        }
    }

    // MARK: The play-through

    private func run() async {
        note("self-test started")
        let bootReady = await waitFor(seconds: 180) { await self.bootState() == "rdy" }
        let bootSeconds = Date().timeIntervalSince(started)
        environment = (await jsObject(Self.environmentProbe)) ?? [:]
        // what became of WebKit's 60 frames-a-second hold (see GameViewController.allowFullFrameRate), and the screen's top rate
        environment["frameRateSwitch"] = GameViewController.frameRateNote
        environment["screenMaxFPS"] = controller?.view.window?.windowScene?.screen.maximumFramesPerSecond
        // Frame-rate read-out on (it shows in the screenshots); mark this run so the second launch can find it.
        await js("(function(){SET.fps=1;saveSet();fpsShow();localStorage.setItem('st-probe','\(Int(started.timeIntervalSince1970))');return 1})()")
        await mark("01-boot", ["bootReady": bootReady, "bootSeconds": round1(bootSeconds)])
        await js(Self.timerScript)

        await tap("start")
        await sleep(3)
        await mark("02-menu")

        await tap("quick")  // PLAY: offline, a match against four bots
        await sleep(8)
        await mark("03-match-portrait")

        await rotate(.landscapeRight)
        await mark("04-match-landscape")

        await tap("pause")
        await sleep(1.5)
        await mark("05-paused-landscape")
        // what the picture costs, part by part (see renderCostScript), while the match is paused
        await js(Self.renderCostScript)
        if await waitFor(seconds: 240, { await self.jsString("window.__stGPU?'done':''") == "done" }) {
            environment["renderCost"] = await jsObject("window.__stGPU")
        } else {
            note("render cost: no result after 240 s")
        }
        await tap("resume")

        let f0 = await jsNumber("window.__stFrames") ?? 0
        await sleep(15)
        let f1 = await jsNumber("window.__stFrames") ?? 0
        await mark("06-match-landscape-later", ["framesPerSecondOver15s": round1((f1 - f0) / 15)])

        await rotate(.portrait)
        await mark("07-match-portrait-again")

        let ended = await waitFor(seconds: 200) { await self.jsString("typeof state!=='undefined'?state:''") == "over" }
        await sleep(4)
        await mark("08-results", ["matchEnded": ended])

        writeReport(finished: true)
        await mark("99-done")
    }

    private func persistCheck() async {
        let bootReady = await waitFor(seconds: 180) { await self.bootState() == "rdy" }
        var result: [String: Any] = await jsObject(#"""
        ({
          probe: localStorage.getItem('st-probe'),
          frameRateSetting: (function () { try { return JSON.parse(localStorage.getItem('ct-set') || '{}').fps; } catch (e) { return null; } })(),
          replaysSaved: (function () { try { return JSON.parse(localStorage.getItem('ct-rpx') || '[]').length; } catch (e) { return -1; } })(),
          bestScore: localStorage.getItem('ct-best')
        })
        """#) ?? [:]
        result["bootReady"] = bootReady
        result["pageErrors"] = pageErrors
        write("persist.json", json(result))
    }

    // MARK: Steps

    private func mark(_ name: String, _ extra: [String: Any] = [:]) async {
        stepNumber += 1
        var entry: [String: Any] = ["step": name, "seconds": round1(Date().timeIntervalSince(started))]
        await js("(window.__stHold=true,1)")  // freeze the picture for the screenshot
        await sleep(1.5)  // let the simulator finish the frames it is drawing
        if let page = await jsObject(Self.pageState) { entry["page"] = page }
        for (key, value) in extra { entry[key] = value }
        steps.append(entry)
        writeReport(finished: false)
        let number = stepNumber
        write("state.txt", "\(number) \(name)")
        let answered = await waitFor(seconds: 480) { self.read("ack.txt") == "\(number)" }
        await js("window.__stRelease()")
        if !answered { note("no screenshot answer for \(name)") }
    }

    private func tap(_ action: String) async {
        let found = await js("(function(){var b=document.querySelector('[data-a=\(action)]');if(!b)return false;b.click();return true})()")
        if (found as? Bool) != true { note("button '\(action)' not found") }
    }

    private func rotate(_ orientation: UIInterfaceOrientationMask) async {
        guard let scene = controller?.view.window?.windowScene else {
            note("no window scene to rotate")
            return
        }
        controller?.setNeedsUpdateOfSupportedInterfaceOrientations()
        scene.requestGeometryUpdate(.iOS(interfaceOrientations: orientation)) { error in
            Task { @MainActor in self.note("rotation refused: \(error.localizedDescription)") }
        }
        await sleep(4)
    }

    private func bootState() async -> String? {
        await jsString("(document.getElementById('boot')||{}).className")
    }

    // MARK: Page messages

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }
        let kind = body["kind"] as? String ?? "?"
        let line = "\(round1(Date().timeIntervalSince(started)))s \(body["text"] as? String ?? "")"
        switch kind {
        case "error": pageErrors.append(line)
        case "console.error": consoleErrors.append(line)
        case "console.warn": if consoleWarnings.count < 50 { consoleWarnings.append(line) }
        case "resource": resourceErrors.append(line)
        default: notes.append(line)
        }
    }

    // MARK: Helpers

    @discardableResult
    private func js(_ expression: String) async -> Any? {
        guard let webView = controller?.webView else { return nil }
        let script = "(function(){try{var v=(\(expression));return JSON.stringify({ok:1,v:v===undefined?null:v})}"
            + "catch(e){return JSON.stringify({ok:0,e:String(e&&e.stack||e)})}})()"
        let raw: Any? = await withCheckedContinuation { continuation in
            webView.evaluateJavaScript(script) { result, _ in continuation.resume(returning: result) }
        }
        guard let text = raw as? String, let data = text.data(using: .utf8),
              let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return nil }
        if (object["ok"] as? Int) == 1 {
            let value = object["v"]
            return value is NSNull ? nil : value
        }
        note("script failed: \(object["e"] ?? "?") | \(expression.prefix(100))")
        return nil
    }

    private func jsString(_ expression: String) async -> String? { await js(expression) as? String }
    private func jsNumber(_ expression: String) async -> Double? { (await js(expression) as? NSNumber)?.doubleValue }
    private func jsObject(_ expression: String) async -> [String: Any]? { await js(expression) as? [String: Any] }

    private func waitFor(seconds: Double, _ condition: () async -> Bool) async -> Bool {
        let end = Date().addingTimeInterval(seconds)
        while Date() < end {
            if await condition() { return true }
            await sleep(0.5)
        }
        return false
    }

    private func sleep(_ seconds: Double) async {
        try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
    }

    private func note(_ text: String) {
        notes.append("\(round1(Date().timeIntervalSince(started)))s \(text)")
    }

    private func writeReport(finished: Bool) {
        let device = UIDevice.current
        let report: [String: Any] = [
            "finished": finished,
            "system": "\(device.systemName) \(device.systemVersion)",
            "screen": "\(Int(UIScreen.main.bounds.width))x\(Int(UIScreen.main.bounds.height)) @\(UIScreen.main.scale)x",
            "environment": environment,
            "steps": steps,
            "pageErrors": pageErrors,
            "consoleErrors": consoleErrors,
            "consoleWarnings": consoleWarnings,
            "resourceErrors": resourceErrors,
            "notes": notes,
        ]
        write("report.json", json(report))
    }

    private func json(_ object: Any) -> String {
        guard JSONSerialization.isValidJSONObject(object),
              let data = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
        else { return "{\"error\":\"report could not be encoded\"}" }
        return String(decoding: data, as: UTF8.self)
    }

    private func write(_ name: String, _ text: String) {
        try? text.write(to: dir.appendingPathComponent(name), atomically: true, encoding: .utf8)
    }

    private func read(_ name: String) -> String? {
        (try? String(contentsOf: dir.appendingPathComponent(name), encoding: .utf8))?
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func round1(_ value: Double) -> Double { (value * 10).rounded() / 10 }
}
#endif
