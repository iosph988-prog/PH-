import SwiftUI
import UIKit
import CryptoKit

private struct TextureCatalogResponse: Decodable {
    let valid: Bool
    let patches: [TextureCatalogItem]?
    let textureBannerUrl: String?
}

private struct TextureCatalogItem: Decodable, Identifiable {
    let id: Int
    let title: String
    let fileName: String
    let logoUrl: String?
    let downloadUrl: String
    let sizeBytes: Int
    let sha256: String
}

private enum TextureCharacter: String, CaseIterable, Identifiable {
    case alok
    case dimitri

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var imageName: String { rawValue == "alok" ? "TextureAlok" : "TextureDimitri" }
}

struct TextureOnlineView: View {
    @State private var items: [TextureCatalogItem] = []
    @State private var message = "Carregando texturas online..."
    @State private var activeIDs: Set<Int> = []
    @State private var textureBannerUrl: String?
    @State private var selectedCharacter: TextureCharacter?
    @State private var selectedItemID: Int?
    @State private var isWorking = false
    @State private var pendingPasswordItem: TextureCatalogItem?
    @State private var pendingPasswordURL: URL?
    @State private var texturePassword = ""

    private var selectedItem: TextureCatalogItem? {
        items.first(where: { $0.id == selectedItemID })
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.018, green: 0.020, blue: 0.027).ignoresSafeArea()
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 0) {
                        header
                            .padding(.bottom, 30)

                        VStack(alignment: .leading, spacing: 7) {
                            Text("ESCOLHA SEU PERSONAGEM")
                                .font(.system(size: 21, weight: .black, design: .rounded))
                                .tracking(0.45)
                                .foregroundStyle(.white)
                            Text("Selecione um card para ver as skins online")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.white.opacity(0.56))
                        }
                        .padding(.bottom, 17)

                        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 14) {
                            ForEach(TextureCharacter.allCases) { character in
                                characterCard(character)
                            }
                        }

                        HStack(spacing: 8) {
                            if message.hasPrefix("Carregando") {
                                ProgressView().tint(Color.white.opacity(0.7))
                            } else {
                                Circle()
                                    .fill(items.isEmpty ? Color.orange : Color.green)
                                    .frame(width: 7, height: 7)
                            }
                            Text(message.isEmpty ? "\(items.count) skins disponíveis online" : message)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.white.opacity(0.56))
                                .lineLimit(2)
                            Spacer(minLength: 0)
                        }
                        .padding(.top, 19)
                        .padding(.horizontal, 3)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 18)
                    .padding(.bottom, 34)
                }
            }
            .background(Color(red: 0.018, green: 0.020, blue: 0.027))
            .toolbar(.hidden, for: .navigationBar)
        }
        .preferredColorScheme(.dark)
        .task { await load() }
        .fullScreenCover(item: $selectedCharacter) { character in
            catalogScreen(for: character)
        }
    }

    private var header: some View {
        HStack(spacing: 11) {
            Image(systemName: "tshirt.fill")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(Color.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text("TEXTURA")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .tracking(0.7)
                    .foregroundStyle(.white)
                Text("SKINS E HOLOGRAMAS")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .tracking(1.1)
                    .foregroundStyle(Color.white.opacity(0.52))
            }
            Spacer()
            HStack(spacing: 6) {
                Circle().fill(Color(red: 0.35, green: 0.91, blue: 0.57)).frame(width: 7, height: 7)
                Text("LIVE")
                    .font(.system(size: 11, weight: .black, design: .rounded))
                    .tracking(0.7)
                    .foregroundStyle(.white)
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 8)
            .background(Color.white.opacity(0.08), in: Capsule())
        }
    }

    private func characterCard(_ character: TextureCharacter) -> some View {
        Button {
            selectedItemID = nil
            selectedCharacter = character
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                ZStack(alignment: .bottomLeading) {
                    Image(character.imageName)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 176)
                        .clipped()
                    LinearGradient(colors: [.clear, Color.black.opacity(0.92)], startPoint: .center, endPoint: .bottom)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(character.title)
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text("Selecionar skins")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color.white.opacity(0.68))
                    }
                    .padding(13)
                }
                .frame(height: 176)
                .overlay(alignment: .topTrailing) {
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(Color.black.opacity(0.52), in: Circle())
                        .padding(10)
                }
            }
            .background(Color(red: 0.075, green: 0.078, blue: 0.090))
            .clipShape(RoundedRectangle(cornerRadius: 19, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 19, style: .continuous).stroke(Color.white.opacity(0.11), lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(character.title), selecionar skins online")
    }

    private func catalogScreen(for character: TextureCharacter) -> some View {
        ZStack {
            Color(red: 0.018, green: 0.020, blue: 0.027).ignoresSafeArea()
            VStack(spacing: 0) {
                HStack {
                    Button { selectedCharacter = nil } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 38, height: 38)
                            .background(Color.white.opacity(0.09), in: Circle())
                    }
                    .buttonStyle(.plain)
                    Spacer()
                    HStack(spacing: 6) {
                        Circle().fill(Color(red: 0.35, green: 0.91, blue: 0.57)).frame(width: 7, height: 7)
                        Text("ONLINE")
                            .font(.system(size: 10, weight: .black, design: .rounded))
                            .tracking(0.8)
                            .foregroundStyle(Color.white.opacity(0.78))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 17)

                VStack(alignment: .leading, spacing: 5) {
                    Text("\(character.title) skins")
                        .font(.system(size: 27, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text("Escolha uma textura disponível online")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.55))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.bottom, 15)

                if items.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "square.stack.3d.up")
                            .font(.system(size: 30, weight: .medium))
                            .foregroundStyle(Color.white.opacity(0.38))
                        Text(message)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Color.white.opacity(0.62))
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(30)
                } else {
                    ScrollView(showsIndicators: false) {
                        LazyVStack(spacing: 10) {
                            ForEach(items) { item in
                                textureRow(item, character: character)
                            }
                        }
                        .padding(.horizontal, 18)
                        .padding(.bottom, 18)
                    }
                }

                actionFooter
            }
        }
        .preferredColorScheme(.dark)
        .alert("Senha da textura", isPresented: Binding(get: { pendingPasswordItem != nil }, set: { visible in
            if !visible { clearPasswordPrompt() }
        })) {
            SecureField("Digite a senha", text: $texturePassword)
            Button("Cancelar", role: .cancel) { clearPasswordPrompt() }
            Button("Aplicar") {
                guard let item = pendingPasswordItem, let url = pendingPasswordURL else { return }
                let password = texturePassword
                clearPasswordPrompt()
                Task { await decodeAndApply(item: item, url: url, password: password) }
            }
        } message: {
            Text("Este pacote TEXTURA está protegido. A senha não é enviada para a API.")
        }
    }

    private func textureRow(_ item: TextureCatalogItem, character: TextureCharacter) -> some View {
        let isSelected = selectedItemID == item.id
        let isActive = activeIDs.contains(item.id)
        return Button { selectedItemID = item.id } label: {
            HStack(spacing: 12) {
                if let raw = item.logoUrl, let url = URL(string: raw) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else {
                            logoPlaceholder
                        }
                    }
                    .frame(width: 58, height: 58)
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                } else {
                    logoPlaceholder
                        .frame(width: 58, height: 58)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                VStack(alignment: .leading, spacing: 5) {
                    Text(item.title)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text("\(character.title) • Free Fire")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.50))
                }
                Spacer(minLength: 4)
                Image(systemName: isSelected ? "checkmark.circle.fill" : (isActive ? "checkmark.seal.fill" : "circle"))
                    .font(.system(size: 21, weight: .medium))
                    .foregroundStyle(isSelected || isActive ? .white : Color.white.opacity(0.34))
            }
            .padding(11)
            .background(Color.white.opacity(isSelected ? 0.12 : 0.065), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.white.opacity(isSelected ? 0.42 : 0.09), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var logoPlaceholder: some View {
        ZStack {
            Color.white.opacity(0.08)
            Image(systemName: "paintpalette.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(Color.white.opacity(0.58))
        }
    }

    private var actionFooter: some View {
        VStack(spacing: 9) {
            if !message.isEmpty && !message.hasPrefix("Carregando") {
                Text(message)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.62))
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Button {
                guard let item = selectedItem else { return }
                isWorking = true
                Task {
                    await applyOrRestore(item)
                    isWorking = false
                }
            } label: {
                HStack(spacing: 9) {
                    if isWorking {
                        ProgressView().tint(Color.black)
                        Text("APLICANDO...")
                    } else if let item = selectedItem, activeIDs.contains(item.id) {
                        Image(systemName: "arrow.uturn.backward")
                        Text("RESTAURAR")
                    } else {
                        Image(systemName: "bolt.fill")
                        Text("INJECT")
                    }
                }
                .font(.system(size: 15, weight: .black, design: .rounded))
                .tracking(0.6)
                .foregroundStyle(Color.black)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(Color.white, in: Capsule())
            }
            .buttonStyle(.plain)
            .disabled(selectedItem == nil || isWorking)
            .opacity(selectedItem == nil ? 0.43 : 1)
        }
        .padding(.horizontal, 18)
        .padding(.top, 12)
        .padding(.bottom, 12)
        .background(Color(red: 0.018, green: 0.020, blue: 0.027))
    }

    private func load() async {
        guard let key = LicenseStore.storedKey else { message = "Faça login para carregar as texturas."; return }
        do {
            let endpoint = URL(string: "https://api-production-182c.up.railway.app/api/patches/catalog")!
            var request = URLRequest(url: endpoint); request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: ["key": key, "device_id": UIDevice.current.identifierForVendor?.uuidString ?? "texture-device", "package": Bundle.main.bundleIdentifier ?? "unknown.bundle", "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0", "section": "texture"])
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
            let catalog = try JSONDecoder().decode(TextureCatalogResponse.self, from: data); textureBannerUrl = catalog.textureBannerUrl; items = catalog.patches ?? []; message = items.isEmpty ? "Nenhuma textura publicada ainda." : ""
        } catch { message = "Não foi possível carregar o catálogo agora." }
    }

    private func applyOrRestore(_ item: TextureCatalogItem) async {
        if activeIDs.contains(item.id) { await restore(item); return }
        do {
            guard let url = URL(string: item.downloadUrl) else { throw URLError(.badURL) }
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
            let actualHash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
            guard data.count == item.sizeBytes, actualHash.caseInsensitiveCompare(item.sha256) == .orderedSame else {
                throw NSError(domain: "Texture", code: 422, userInfo: [NSLocalizedDescriptionKey: "O arquivo TEXTURA foi alterado ou baixado incompleto."])
            }
            let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("TextureCatalog", isDirectory: true)
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            let localURL = dir.appendingPathComponent(item.fileName)
            try data.write(to: localURL, options: .atomic)
            let packageData = try PatchProjectLibrary.readPackage(at: localURL)
            let summary = try PatchPackageCodec.inspect(packageData)
            if summary.isPasswordProtected {
                await MainActor.run {
                    pendingPasswordItem = item
                    pendingPasswordURL = localURL
                    texturePassword = ""
                    message = "Digite a senha para aplicar esta textura."
                }
                return
            }
            await decodeAndApply(item: item, url: localURL, password: nil)
        } catch { await MainActor.run { message = "Não foi possível aplicar: \(error.localizedDescription)" } }
    }

    private func decodeAndApply(item: TextureCatalogItem, url: URL, password: String?) async {
        do {
            let packageData = try PatchProjectLibrary.readPackage(at: url)
            let decoded = try PatchPackageCodec.decode(packageData, password: password)
            _ = try DevicePatchService.apply(project: decoded.project)
            await MainActor.run { activeIDs.insert(item.id); message = "Aplicado: \(item.title)" }
        } catch { await MainActor.run { message = "Não foi possível aplicar: \(error.localizedDescription)" } }
    }

    private func clearPasswordPrompt() {
        pendingPasswordItem = nil
        pendingPasswordURL = nil
        texturePassword = ""
    }

    private func restore(_ item: TextureCatalogItem) async {
        do {
            let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("TextureCatalog", isDirectory: true)
            let localURL = dir.appendingPathComponent(item.fileName)
            let packageData = try PatchProjectLibrary.readPackage(at: localURL)
            let decoded = try PatchPackageCodec.decode(packageData, password: nil)
            guard let receipt = DevicePatchService.latestReceipt(projectID: decoded.project.id) else { throw NSError(domain: "Texture", code: 404, userInfo: [NSLocalizedDescriptionKey: "Nenhum backup encontrado"]) }
            try DevicePatchService.restore(receipt: receipt)
            await MainActor.run { activeIDs.remove(item.id); message = "Restaurado: \(item.title)" }
        } catch { await MainActor.run { message = "Não foi possível restaurar: \(error.localizedDescription)" } }
    }
}
