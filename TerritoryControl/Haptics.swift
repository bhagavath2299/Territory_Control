import UIKit
import WebKit

/// The game's Vibration setting calls navigator.vibrate(milliseconds). iPhone browsers have no such call,
/// so on the web it did nothing. In the app it plays iPhone haptics: short buzzes are light taps,
/// longer ones heavier, and the long buzz when you are knocked out is a sharp double knock.
@MainActor
final class Haptics: NSObject, WKScriptMessageHandler {
    static let handlerName = "tcHaptics"

    static let pageScript = #"""
    (function () {
      var h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.tcHaptics;
      if (!h) return;
      var vibrate = function (pattern) {
        var ms = 0;
        if (Array.isArray(pattern)) { for (var i = 0; i < pattern.length; i += 2) ms += +pattern[i] || 0; }
        else { ms = +pattern || 0; }
        if (ms > 0) { try { h.postMessage(ms); } catch (e) {} }
        return true;
      };
      try { Object.defineProperty(Navigator.prototype, 'vibrate', { value: vibrate, configurable: true, writable: true }); }
      catch (e) { try { navigator.vibrate = vibrate; } catch (e2) {} }
    })();
    """#

    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    private let notice = UINotificationFeedbackGenerator()
    private var lastTap: CFTimeInterval = 0

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let ms = (message.body as? NSNumber)?.doubleValue, ms > 0 else { return }
        let now = CACurrentMediaTime()
        guard now - lastTap > 0.05 else { return }  // taps closer together than this blur into one
        lastTap = now
        switch ms {
        case ..<20: light.impactOccurred()
        case ..<50: medium.impactOccurred()
        case ..<150: heavy.impactOccurred()
        default: notice.notificationOccurred(.error)
        }
    }
}
