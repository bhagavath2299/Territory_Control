import UIKit
import WebKit

/// Runs the game full screen. The game's files are inside the app and are served at app://localhost,
/// so it never opens Safari and needs no connection, not even on the first launch.
final class GameViewController: UIViewController {
    /// #05080f, the colour of the game's boot screen, so the launch never flashes white.
    static let backgroundColor = UIColor(named: "LaunchBackground")
        ?? UIColor(red: 5 / 255, green: 8 / 255, blue: 15 / 255, alpha: 1)
    static let scheme = "app"
    static let startURL = URL(string: "app://localhost/index.html")!

    private(set) var webView: WKWebView!
    private let haptics = Haptics()
    private var restarts: [Date] = []
    private var gameLoaded = false

    override func loadView() {
        let config = WKWebViewConfiguration()
        if let www = Bundle.main.url(forResource: "www", withExtension: nil) {
            config.setURLSchemeHandler(BundleSchemeHandler(root: www), forURLScheme: Self.scheme)
        }
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsAirPlayForMediaPlayback = false
        config.allowsPictureInPictureMediaPlayback = false
        config.dataDetectorTypes = []
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        Self.allowFullFrameRate(config.preferences)
        // Settings, best score and replays are kept between launches.
        config.websiteDataStore = .default()

        let scripts = config.userContentController
        scripts.addUserScript(WKUserScript(source: Haptics.pageScript, injectionTime: .atDocumentStart,
                                           forMainFrameOnly: true))
        scripts.addUserScript(WKUserScript(source: Self.safeAreaScript, injectionTime: .atDocumentStart,
                                           forMainFrameOnly: true))
        scripts.add(haptics, name: Haptics.handlerName)

        #if SELFTEST
        SelfTest.install(in: config)
        #endif

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = Self.backgroundColor
        webView.scrollView.backgroundColor = Self.backgroundColor
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
        webView.allowsBackForwardNavigationGestures = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        #if DEBUG || SELFTEST
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        #endif
        self.webView = webView
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        #if SELFTEST
        SelfTest.shared.start(controller: self)
        #endif
    }

    // The game is started once the screen is up and has its final size (see safeAreaScript for the safe areas).
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !gameLoaded else { return }
        gameLoaded = true
        webView.load(URLRequest(url: Self.startURL))
    }

    /// The game reads the screen's safe areas (notch or Dynamic Island, home bar) once when it starts and again
    /// on every resize. Inside an app, iOS can hand them to the page a moment after that first reading, which
    /// left the minimap and joystick under the island and home bar until the phone was turned. This watches
    /// the safe areas from inside the page and sends the game a resize as soon as they change.
    static let safeAreaScript = #"""
    (function () {
      function watch() {
        var probe = document.createElement('div');
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
          'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
        document.documentElement.appendChild(probe);
        var last = null;
        function check() {
          var s = getComputedStyle(probe);
          var now = s.paddingTop + ' ' + s.paddingRight + ' ' + s.paddingBottom + ' ' + s.paddingLeft;
          if (last !== null && now !== last) window.dispatchEvent(new Event('resize'));
          last = now;
        }
        check();
        try { new ResizeObserver(check).observe(probe, { box: 'border-box' }); } catch (e) {}
        var n = 0, t = setInterval(function () { check(); if (++n >= 60) clearInterval(t); }, 1000);
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
    })();
    """#

    /// On iPhones with a 120 Hz screen (ProMotion), web pages are held to 60 frames a second unless the page's
    /// "prefer page rendering updates near 60 fps" setting is off. That setting is not public API, so it is switched
    /// off only when WebKit has it (on an iOS that does not, nothing happens and the game simply runs at 60).
    /// Info.plist also sets CADisableMinimumFrameDurationOnPhone, which lets the app's screen run above 60 Hz at all.
    /// Note for an App Store release: the private setting would need to go (or be replaced by public API, if one appears).
    static func allowFullFrameRate(_ preferences: WKPreferences) {
        let setter = Selector(("_setPreferPageRenderingUpdatesNear60FPSEnabled:"))
        guard preferences.responds(to: setter) else { return }
        preferences.setValue(false, forKey: "preferPageRenderingUpdatesNear60FPSEnabled")
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    // A swipe in from a screen edge first wakes the system handle and only a second swipe leaves the game,
    // so steering near the edge of the screen does not throw you out of a match.
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .allButUpsideDown }
}

extension GameViewController: WKNavigationDelegate, WKUIDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { return decisionHandler(.cancel) }
        switch url.scheme?.lowercased() {
        case Self.scheme, "about", "data", "blob":
            decisionHandler(.allow)
        default:
            // Anything outside the game opens in its own app, never inside the game screen.
            if navigationAction.navigationType == .linkActivated || navigationAction.targetFrame == nil {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, url.scheme?.lowercased() != Self.scheme {
            UIApplication.shared.open(url)
        }
        return nil
    }

    // If iOS stops the game's page while the app is in the background (to free memory), start the game
    // again instead of showing a blank screen. Not more than three times a minute, so a page that keeps
    // failing does not loop.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        let now = Date()
        restarts = restarts.filter { now.timeIntervalSince($0) < 60 } + [now]
        guard restarts.count <= 3 else { return }
        webView.load(URLRequest(url: Self.startURL))
    }
}
