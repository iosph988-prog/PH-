import Foundation

/// Public License Atelier API endpoints.
/// No administrative credentials or server secrets belong in the client.
enum LicenseEndpoint {
    static let baseURL = URL(string: "https://keypanel-mefhz8pp.manus.space")!
    static let validate = baseURL.appendingPathComponent("api/license/validate")
    static let catalog = baseURL.appendingPathComponent("api/patches/catalog")
}

struct LicenseRequest: Encodable {
    let key: String
    let device_id: String
    let package: String
    let app_version: String
}

struct LicenseResponse: Decodable {
    let valid: Bool
    let code: String
    let message: String
    let expiresAt: String?
    let activatedAt: String?
    let durationDays: Int?
    let durationMinutes: Int?
    let deviceLimit: Int?
    let supportUrl: String?
}

struct CatalogResponse: Decodable {
    let valid: Bool
    let code: String
    let message: String
    let expiresAt: String?
    let activatedAt: String?
    let patches: [CatalogItem]?
}

struct CatalogItem: Decodable, Identifiable {
    let id: Int
    let slug: String
    let title: String
    let game: String
    let enabled: Bool
    let injectionMode: String?
    let bundleId: String?
    let injectionPath: String?
    let originalSearchName: String?
    let versionId: Int
    let version: Int
    let fileName: String
    let sha256: String
    let sizeBytes: Int
    let publishedAt: String?
    let downloadUrl: String?
}

enum LicenseAPIError: LocalizedError {
    case invalidHTTPStatus(Int)
    case denied(String)

    var errorDescription: String? {
        switch self {
        case .invalidHTTPStatus(let status):
            return "A API retornou HTTP \(status)."
        case .denied(let message):
            return message
        }
    }
}

/// Client for the public validation and catalog routes.
/// Access is granted only when `valid` is the Boolean `true`.
final class LicenseAPI {
    func validate(_ request: LicenseRequest) async throws -> LicenseResponse {
        let response: LicenseResponse = try await post(LicenseEndpoint.validate, body: request)
        guard response.valid == true else { throw LicenseAPIError.denied(response.message) }
        return response
    }

    func catalog(_ request: LicenseRequest) async throws -> CatalogResponse {
        let response: CatalogResponse = try await post(LicenseEndpoint.catalog, body: request)
        guard response.valid == true else { throw LicenseAPIError.denied(response.message) }
        return response
    }

    private func post<RequestBody: Encodable, ResponseBody: Decodable>(
        _ url: URL,
        body: RequestBody
    ) async throws -> ResponseBody {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw LicenseAPIError.invalidHTTPStatus(-1)
        }
        guard (200...299).contains(http.statusCode) || http.statusCode == 503 else {
            throw LicenseAPIError.invalidHTTPStatus(http.statusCode)
        }
        return try JSONDecoder().decode(ResponseBody.self, from: data)
    }
}
