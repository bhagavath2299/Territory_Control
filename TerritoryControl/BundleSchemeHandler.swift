import UniformTypeIdentifiers
import WebKit

/// Serves the files in the app's www folder at app://localhost/...
/// A fixed address gives the page a stable home, so what it saves (settings, best score, replays)
/// is still there next time, and nothing is ever downloaded.
@MainActor
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        var path = url.path
        if path.isEmpty || path.hasSuffix("/") { path += "index.html" }
        let file = root.appendingPathComponent(String(path.drop(while: { $0 == "/" }))).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"),
              let data = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            respond(urlSchemeTask, url: url, status: 404, type: "text/plain; charset=utf-8",
                    data: Data("Not found".utf8))
            return
        }
        respond(urlSchemeTask, url: url, status: 200, type: Self.mimeType(for: file.pathExtension), data: data)
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func respond(_ task: WKURLSchemeTask, url: URL, status: Int, type: String, data: Data) {
        let headers = ["Content-Type": type, "Content-Length": String(data.count), "Cache-Control": "no-cache"]
        guard let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1",
                                             headerFields: headers) else {
            task.didFailWithError(URLError(.cannotParseResponse))
            return
        }
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    static func mimeType(for fileExtension: String) -> String {
        switch fileExtension.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "webmanifest": return "application/json"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "svg": return "image/svg+xml"
        case "wasm": return "application/wasm"
        case "mp3": return "audio/mpeg"
        case "m4a": return "audio/mp4"
        case "ogg": return "audio/ogg"
        case "wav": return "audio/wav"
        case "glb": return "model/gltf-binary"
        case "ktx2": return "image/ktx2"
        default: return UTType(filenameExtension: fileExtension)?.preferredMIMEType ?? "application/octet-stream"
        }
    }
}
