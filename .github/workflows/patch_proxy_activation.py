from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")


def line_indent(source: str, offset: int) -> str:
    start = source.rfind("\n", 0, offset) + 1
    return source[start:offset]


def block(base: str, content: str) -> str:
    return "\n".join((base + line if line else "") for line in content.strip("\n").splitlines())


state_anchor = "@State private var showingProxyCatalog = false"
assert text.count(state_anchor) == 1, "PROXY screen state not found"
pos = text.index(state_anchor)
indent = line_indent(text, pos)
new_state = '''@State private var selectedFeatureID: String? = nil
@State private var isProxyWorking = false
@State private var isRestoringProxyPatch = false
@State private var proxyActionMessage = ""
@State private var activeFeatureIDs: Set<String> = []
@State private var activeReceipts: [String: PatchTransactionReceipt] = [:]'''
text = text.replace(state_anchor, state_anchor + "\n" + block(indent, new_state), 1)

# Selecting another game must start with no stale feature selection.
game_action = re.compile(r'(?m)^([ \t]*)selectedGameID = game\.id\n\1showingProxyCatalog = true$')
text, game_count = game_action.subn(
    lambda m: m.group(1) + "selectedGameID = game.id\n"
    + m.group(1) + "selectedFeatureID = nil\n"
    + m.group(1) + 'proxyActionMessage = ""\n'
    + m.group(1) + "showingProxyCatalog = true",
    text,
    count=1,
)
assert game_count == 1, "game-card action anchor not found"

feature_list = '''private var featureList: some View {
    VStack(spacing: 10) {
        ForEach(features) { feature in
            CompactPatchCard(
                feature: feature,
                isSelected: selectedFeatureID == feature.id,
                isActive: activeFeatureIDs.contains(feature.id),
                isWorking: isProxyWorking,
                darkMode: true,
                onSelect: {
                    selectedFeatureID = feature.id
                    proxyActionMessage = ""
                    synchronizeAppliedState(for: feature)
                },
                onAppearSync: { synchronizeAppliedState(for: feature) }
            )
        }
    }
}'''
feature_start = text.index("private var featureList: some View {")
bottom_start = text.index("private var bottomNav: some View {", feature_start)
feature_line = text.rfind("\n", 0, feature_start) + 1
bottom_line = text.rfind("\n", 0, bottom_start) + 1
feature_indent = line_indent(text, feature_start)
text = text[:feature_line] + block(feature_indent, feature_list) + "\n\n" + text[bottom_line:]

# Keep the existing online resolver and DevicePatchService calls; only move them to the shared action footer.
methods = '''private var selectedFeature: CompactFeature? {
    guard let id = selectedFeatureID else { return nil }
    return features.first(where: { $0.id == id })
}

private var selectedFeatureIsActive: Bool {
    guard let feature = selectedFeature else { return false }
    return activeFeatureIDs.contains(feature.id)
}

private func activateOrRestoreSelectedPatch() {
    guard !isProxyWorking, let feature = selectedFeature else { return }
    if activeFeatureIDs.contains(feature.id) {
        restorePatch(feature)
    } else {
        applyPatch(feature)
    }
}

private func applyPatch(_ feature: CompactFeature) {
    guard !isProxyWorking else { return }
    isProxyWorking = true
    isRestoringProxyPatch = false
    proxyActionMessage = ""
    Task {
        do {
            guard let url = await RemotePatchAPI.resolve(patch: feature.patch) else {
                throw NSError(domain: "RemotePatch", code: 404, userInfo: [NSLocalizedDescriptionKey: "Arquivo não encontrado online: \\(feature.patch.fileName)"])
            }
            let data = try PatchProjectLibrary.readPackage(at: url)
            let decoded = try PatchPackageCodec.decode(data, password: nil)
            let receipt = try DevicePatchService.apply(project: decoded.project)
            await MainActor.run {
                activeReceipts[feature.id] = receipt
                activeFeatureIDs.insert(feature.id)
                isProxyWorking = false
                proxyActionMessage = "Aplicado: \\(feature.title)"
            }
        } catch {
            await MainActor.run {
                isProxyWorking = false
                isRestoringProxyPatch = false
                proxyActionMessage = "Não foi possível aplicar: \\(error.localizedDescription)"
            }
        }
    }
}

private func restorePatch(_ feature: CompactFeature) {
    guard !isProxyWorking else { return }
    guard let receipt = activeReceipts[feature.id] ?? findAppliedProjectID(for: feature).flatMap({ DevicePatchService.latestReceipt(projectID: $0) }) else {
        activeFeatureIDs.remove(feature.id)
        activeReceipts.removeValue(forKey: feature.id)
        proxyActionMessage = "Nenhum backup encontrado para este patch."
        return
    }
    isProxyWorking = true
    isRestoringProxyPatch = true
    proxyActionMessage = ""
    let featureID = feature.id
    let featureTitle = feature.title
    Task.detached(priority: .userInitiated) {
        do {
            try DevicePatchService.restore(receipt: receipt)
            await MainActor.run {
                activeFeatureIDs.remove(featureID)
                activeReceipts.removeValue(forKey: featureID)
                isProxyWorking = false
                isRestoringProxyPatch = false
                proxyActionMessage = "Restaurado: \\(featureTitle)"
            }
        } catch {
            await MainActor.run {
                isProxyWorking = false
                isRestoringProxyPatch = false
                proxyActionMessage = "Não foi possível restaurar: \\(error.localizedDescription)"
            }
        }
    }
}

private func synchronizeAppliedState(for feature: CompactFeature) {
    guard !isProxyWorking, !activeFeatureIDs.contains(feature.id),
          let projectID = findAppliedProjectID(for: feature),
          let receipt = DevicePatchService.latestReceipt(projectID: projectID) else { return }
    activeReceipts[feature.id] = receipt
    activeFeatureIDs.insert(feature.id)
}

private func findAppliedProjectID(for feature: CompactFeature) -> UUID? {
    guard let url = RemotePatchAPI.cachedFile(named: feature.patch.fileName),
          let data = try? PatchProjectLibrary.readPackage(at: url),
          let decoded = try? PatchPackageCodec.decode(data, password: nil) else { return nil }
    return decoded.project.id
}

private var proxyActionFooter: some View {
    VStack(spacing: 9) {
        if !proxyActionMessage.isEmpty {
            Text(proxyActionMessage)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.62))
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        Button { activateOrRestoreSelectedPatch() } label: {
            HStack(spacing: 9) {
                if isProxyWorking {
                    ProgressView().tint(.black)
                    Text(isRestoringProxyPatch ? "RESTAURANDO..." : "APLICANDO...")
                } else if selectedFeatureIsActive {
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
        .disabled(selectedFeature == nil || isProxyWorking)
        .opacity(selectedFeature == nil ? 0.43 : 1)
    }
    .padding(.horizontal, 18)
    .padding(.top, 12)
    .padding(.bottom, 12)
    .background(Color(red: 0.018, green: 0.020, blue: 0.027))
}'''
anchor = "private var proxyCatalogScreen: some View {"
assert text.count(anchor) == 1, "catalog screen anchor missing"
text = text.replace(anchor, block(indent, methods) + "\n\n" + indent + anchor, 1)

catalog = '''private var proxyCatalogScreen: some View {
    ZStack {
        Color(red: 0.018, green: 0.020, blue: 0.027).ignoresSafeArea()
        VStack(spacing: 0) {
            HStack {
                Button { showingProxyCatalog = false } label: {
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
                Text("External Proxy")
                    .font(.system(size: 27, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text("Selecione um recurso e aperte INJECT.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.55))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.bottom, 15)

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    VStack(alignment: .leading, spacing: 11) {
                        Text("INSTRUÇÕES IMPORTANTES")
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .tracking(0.35)
                            .foregroundStyle(Color(red: 1.0, green: 0.72, blue: 0.25))
                        HStack(alignment: .top, spacing: 9) {
                            Text("1.")
                                .font(.system(size: 12, weight: .black))
                                .foregroundStyle(Color(red: 1.0, green: 0.72, blue: 0.25))
                            Text("Entre no jogo e aguarde carregar até 40%. Após isso, volte para a IPA, selecione o recurso que deseja utilizar e aperte INJECT.")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.white.opacity(0.78))
                                .fixedSize(horizontal: false, vertical: true)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        HStack(alignment: .top, spacing: 9) {
                            Text("2.")
                                .font(.system(size: 12, weight: .black))
                                .foregroundStyle(Color(red: 1.0, green: 0.72, blue: 0.25))
                            Text("Depois de entrar no lobby, volte imediatamente para a IPA e aperte RESTAURAR.")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.white.opacity(0.78))
                                .fixedSize(horizontal: false, vertical: true)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.orange.opacity(0.09), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.orange.opacity(0.23), lineWidth: 1))

                    if features.isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "square.stack.3d.up")
                                .font(.system(size: 30, weight: .medium))
                                .foregroundStyle(Color.white.opacity(0.38))
                            Text(remoteCatalog == nil ? "Carregando catálogo online..." : "Nenhum patch publicado para este jogo.")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.white.opacity(0.62))
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(24)
                    } else {
                        featureList
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 18)
            }
            proxyActionFooter
        }
    }
    .preferredColorScheme(.dark)
}'''
catalog_start = text.index("private var proxyCatalogScreen: some View {")
header_start = text.index("private var header: some View {", catalog_start)
catalog_line = text.rfind("\n", 0, catalog_start) + 1
header_line = text.rfind("\n", 0, header_start) + 1
catalog_indent = line_indent(text, catalog_start)
text = text[:catalog_line] + block(catalog_indent, catalog) + "\n\n" + text[header_line:]

row = '''private struct CompactPatchCard: View {
    let feature: CompactFeature
    let isSelected: Bool
    let isActive: Bool
    let isWorking: Bool
    let darkMode: Bool
    let onSelect: () -> Void
    let onAppearSync: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                Image(systemName: feature.icon)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 58, height: 58)
                    .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: 5) {
                    Text(feature.title)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(feature.subtitle)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.50))
                        .lineLimit(2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                Spacer(minLength: 4)
                Image(systemName: isSelected ? "checkmark.circle.fill" : (isActive ? "checkmark.seal.fill" : "circle"))
                    .font(.system(size: 21, weight: .medium))
                    .foregroundStyle(isSelected || isActive ? .white : Color.white.opacity(0.34))
            }
            .padding(11)
            .background(Color.white.opacity(isSelected ? 0.12 : 0.065), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.white.opacity(isSelected ? 0.42 : 0.09), lineWidth: 1))
            .opacity(isWorking ? 0.6 : 1)
        }
        .buttonStyle(.plain)
        .disabled(isWorking)
        .onAppear(perform: onAppearSync)
    }
}'''
row_start = text.index("private struct CompactPatchCard: View {")
desc_start = text.index("private struct RemotePatchDescriptor", row_start)
row_line = text.rfind("\n", 0, row_start) + 1
desc_line = text.rfind("\n", 0, desc_start) + 1
row_indent = line_indent(text, row_start)
text = text[:row_line] + block(row_indent, row) + "\n\n" + text[desc_line:]

for required in (
    'RemotePatchAPI.fetchCatalog(section: "patches")',
    'RemotePatchAPI.resolve(patch: feature.patch)',
    'RemotePatchAPI.cachedFile(named: feature.patch.fileName)',
    'DevicePatchService.apply(project: decoded.project)',
    'DevicePatchService.restore(receipt: receipt)',
    'Text("INJECT")',
    'Text("RESTAURAR")',
    'private func synchronizeAppliedState(for feature: CompactFeature)',
):
    assert required in text, f"required online/action behavior missing: {required}"

def remove_legacy_restore(source: str) -> tuple[str, int]:
    timer = "Task.sleep(nanoseconds: 5_000_000_000)"
    removed = 0
    while timer in source:
        timer_pos = source.index(timer)
        line_start = source.rfind("\n", 0, timer_pos) + 1
        line_end = source.find("\n", timer_pos)
        if line_end < 0:
            line_end = len(source)
        next_code = line_end + 1
        while next_code < len(source) and source[next_code].isspace():
            next_code += 1
        match = re.match(r"await MainActor\.run\s*\{", source[next_code:])
        if not match:
            raise ValueError("Five-second PROXY timer is not followed by its expected restore closure")
        opening = next_code + match.end() - 1
        depth = 0
        closing = None
        for index in range(opening, len(source)):
            if source[index] == "{":
                depth += 1
            elif source[index] == "}":
                depth -= 1
                if depth == 0:
                    closing = index
                    break
        if closing is None:
            raise ValueError("Could not locate the end of the legacy PROXY restore closure")
        remove_end = closing + 1
        if source[remove_end:remove_end + 2] == "\r\n":
            remove_end += 2
        elif source[remove_end:remove_end + 1] == "\n":
            remove_end += 1
        source = source[:line_start] + source[remove_end:]
        removed += 1
    return source, removed


text, removed_timers = remove_legacy_restore(text)
assert "Task.sleep(nanoseconds: 5_000_000_000)" not in text, "old automatic five-second restore remains"
assert text.count("private var proxyActionFooter: some View {") == 1
assert text.count("private struct CompactPatchCard: View {") == 1
path.write_text(text, encoding="utf-8")
