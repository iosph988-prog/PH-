from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")


def line_indent(source: str, offset: int) -> str:
    start = source.rfind("\n", 0, offset) + 1
    return source[start:offset]


def block(base: str, content: str) -> str:
    lines = content.strip("\n").splitlines()
    return "\n".join((base + line if line else "") for line in lines)


state_anchor = '@State private var selectedGameID = "free-fire"'
assert text.count(state_anchor) == 1, "selectedGameID anchor missing or ambiguous"
pos = text.index(state_anchor)
base = line_indent(text, pos)
text = text.replace(
    state_anchor,
    state_anchor + "\n" + base + "@State private var showingProxyCatalog = false",
    1,
)

# Match the always-dark, high-contrast look of the TEXTURA screen.
text, dark_count = re.subn(
    r'(?m)^([ \t]*)@AppStorage\("patchesDarkMode"\) private var darkMode = (?:true|false)',
    r'\1private let darkMode = true',
    text,
    count=1,
)
assert dark_count == 1, "dark-mode declaration not found"

# The PROXY home screen mirrors TEXTURA: concise heading, game cards, online status.
body_start = text.index("var body: some View {")
body_end = text.index("private var fg: Color", body_start)
body = text[body_start:body_end]
body, title_count = re.subn(
    r'(?m)^([ \t]*)sectionTitle\("SELECIONE O JOGO", top: 30\)$',
    lambda m: (
        m.group(1) + 'sectionTitle("ESCOLHA O JOGO", top: 20)\n'
        + m.group(1) + 'Text("Selecione um card para ver os patches online")\n'
        + m.group(1) + '    .font(.system(size: 14, weight: .medium))\n'
        + m.group(1) + '    .foregroundStyle(muted)\n'
        + m.group(1) + '    .padding(.top, 7)'
    ),
    body,
    count=1,
)
assert title_count == 1, "game-selection heading not found"

banner_match = re.search(r'(?m)^([ \t]*)header\s*$', body)
assert banner_match, "PROXY header call not found in body"
banner = '''ProxyGIFBannerView()
.frame(maxWidth: .infinity)
.frame(height: 220)
.padding(.top, 12)
.padding(.bottom, 12)'''
body = body[:banner_match.end()] + "\n" + block(banner_match.group(1), banner) + body[banner_match.end():]

features_section = re.compile(
    r'(?m)^([ \t]*)sectionTitle\("FUNÇÕES DE AIMBOT", top: 28\).*?^\1featureList\.padding\(\.top, 14\)\s*$',
    re.S | re.M,
)
body, removed = features_section.subn("", body, count=1)
assert removed == 1, "inline PROXY list block not found"

status = '''HStack(spacing: 8) {
    Circle().fill(Color(red: 0.35, green: 0.91, blue: 0.57)).frame(width: 7, height: 7)
    Text(remoteCatalog == nil ? "Carregando patches online..." : "\\(features.count) patches disponíveis online")
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(Color.white.opacity(0.56))
    Spacer(minLength: 0)
}
.padding(.top, 19)
.padding(.horizontal, 3)'''
status_match = re.search(r'(?m)^([ \t]*)gameCards\s*$', body)
assert status_match, "gameCards call not found in body"
status_block = block(status_match.group(1), status)
body = body[:status_match.end()] + "\n" + status_block + body[status_match.end():]
body = body.replace(".preferredColorScheme(darkMode ? .dark : .light)", ".preferredColorScheme(.dark)", 1)
body = re.sub(r'(?m)^[ \t]*\.toolbar\(\.hidden, for: \.tabBar\)\s*\n', "", body, count=1)
text = text[:body_start] + body + text[body_end:]

header = '''private var header: some View {
    HStack(spacing: 11) {
        Image(systemName: "shield.lefthalf.filled")
            .font(.system(size: 22, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 46, height: 46)
            .background(Color.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
        VStack(alignment: .leading, spacing: 2) {
            Text("PROXY")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .tracking(0.7)
                .foregroundStyle(.white)
            Text("PATCHES ONLINE")
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
}'''
header_match = re.search(r'(?m)^([ \t]*)private var header: some View \{', text)
assert header_match, "PROXY header not found"
header_indent = header_match.group(1)
section_match = re.search(r'(?m)^([ \t]*)private func sectionTitle', text[header_match.end():])
assert section_match, "sectionTitle boundary not found after header"
section_start = header_match.end() + section_match.start()
header_line = text.rfind("\n", 0, header_match.start()) + 1
section_line = text.rfind("\n", 0, section_start) + 1
text = text[:header_line] + block(header_indent, header) + "\n\n" + text[section_line:]

cards = '''private var gameCards: some View {
    GeometryReader { proxy in
        let width = max(130, (proxy.size.width - 12) / 2)
        HStack(spacing: 12) {
            ForEach(preloadedGames) { game in
                Button {
                    selectedGameID = game.id
                    showingProxyCatalog = true
                } label: {
                    VStack(alignment: .leading, spacing: 9) {
                        HStack {
                            Text(game.title)
                                .font(.system(size: 15, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.72)
                            Spacer(minLength: 4)
                            if selectedGameID == game.id {
                                Text("SELECIONADO")
                                    .font(.system(size: 8, weight: .black, design: .rounded))
                                    .tracking(0.4)
                                    .foregroundStyle(Color.white.opacity(0.82))
                            }
                        }
                        Text(selectedGameID == game.id ? "Toque para abrir os patches" : "Toque para selecionar")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.white.opacity(0.62))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                        Spacer(minLength: 0)
                    }
                    .frame(width: width - 26, height: 92, alignment: .leading)
                    .padding(.horizontal, 13)
                    .background(Color.white.opacity(selectedGameID == game.id ? 0.13 : 0.065), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.white.opacity(selectedGameID == game.id ? 0.42 : 0.12), lineWidth: selectedGameID == game.id ? 1.5 : 1))
                }
                .buttonStyle(.plain)
            }
        }
    }
    .frame(height: 92)
    .fullScreenCover(isPresented: $showingProxyCatalog) {
        proxyCatalogScreen
    }
}'''
game_match = re.search(r'(?m)^([ \t]*)private var gameCards: some View \{', text)
assert game_match, "gameCards property not found"
feature_match = re.search(r'(?m)^([ \t]*)private var featureList: some View \{', text[game_match.end():])
assert feature_match, "featureList boundary not found after gameCards"
feature_start = game_match.end() + feature_match.start()
game_line = text.rfind("\n", 0, game_match.start()) + 1
feature_line = text.rfind("\n", 0, feature_start) + 1
game_indent = game_match.group(1)
text = text[:game_line] + block(game_indent, cards) + "\n\n" + text[feature_line:]

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
                Text("\\(selectedGame.title) patches")
                    .font(.system(size: 27, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text("Escolha um recurso disponível online")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.55))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.bottom, 15)

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
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(30)
            } else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 10) {
                        ForEach(features) { feature in
                            CompactPatchCard(feature: feature, store: store, darkMode: true)
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 18)
                }
            }
        }
    }
    .preferredColorScheme(.dark)
}'''
header_match = re.search(r'(?m)^([ \t]*)private var header: some View \{', text)
assert header_match, "header boundary not found for catalog screen"
header_indent = header_match.group(1)
header_line = text.rfind("\n", 0, header_match.start()) + 1
text = text[:header_line] + block(header_indent, catalog) + "\n\n" + text[header_line:]

compact_start = text.index("private struct CompactPatchCard: View {")
compact_body_match = re.search(r'(?m)^([ \t]*)var body: some View \{', text[compact_start:])
assert compact_body_match, "CompactPatchCard body not found"
body_start = compact_start + compact_body_match.start()
body_indent = compact_body_match.group(1)
apply_match = re.search(r'(?m)^([ \t]*)private func applyPatch\(\)', text[body_start:])
assert apply_match, "applyPatch boundary not found"
apply_start = body_start + apply_match.start()
body_line = text.rfind("\n", 0, body_start) + 1
apply_line = text.rfind("\n", 0, apply_start) + 1
compact_body = '''var body: some View {
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
            Text(feature.subtitle)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.50))
                .lineLimit(2)
        }
        Spacer(minLength: 4)
        Toggle("", isOn: Binding(get: { isActive }, set: { on in
            guard !isWorking else { return }
            if on { applyPatch() } else { restorePatch() }
        }))
        .labelsHidden()
        .tint(.white)
    }
    .padding(11)
    .background(Color.white.opacity(0.065), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.white.opacity(0.09), lineWidth: 1))
    .opacity(isWorking ? 0.6 : 1)
    .onAppear { synchronizeAppliedState() }
    .alert("Patch", isPresented: Binding(get: { alertMessage != nil }, set: { if !$0 { alertMessage = nil } })) {
        Button("OK", role: .cancel) { alertMessage = nil }
    } message: { Text(alertMessage ?? "") }
}'''
text = text[:body_line] + block(body_indent, compact_body) + "\n\n" + text[apply_line:]

# Verify data and patch behavior remains present; this script changes presentation only.
for required in (
    'RemotePatchAPI.fetchCatalog(section: "patches")',
    'RemotePatchAPI.resolve(patch: feature.patch)',
    'private func applyPatch()',
    'private func restorePatch()',
    'DevicePatchService.apply(project: decoded.project)',
    'DevicePatchService.restore(receipt: receipt)',
    '$0.section == "patches"',
):
    assert required in text, f"required PROXY behavior missing: {required}"
assert text.count("private var proxyCatalogScreen: some View {") == 1
assert text.count("showingProxyCatalog = true") == 1
assert "darkMode.toggle()" not in text, "dark theme control should not remain in the TEXTURA-matched PROXY header"
final_body_start = text.index("var body: some View {")
final_body_end = text.index("private var fg: Color", final_body_start)
body_section = text[final_body_start:final_body_end]
assert body_section.count("ProxyGIFBannerView()") == 1, "large PROXY GIF banner missing or duplicated"
assert body_section.index("header") < body_section.index("ProxyGIFBannerView()") < body_section.index('sectionTitle("ESCOLHA O JOGO"') < body_section.index("gameCards"), "PROXY GIF and game-card order is incorrect"
game_start = text.index("private var gameCards: some View {", final_body_end)
feature_start = text.index("private var featureList: some View {", game_start)
game_block = text[game_start:feature_start]
assert "remoteLogo(" not in game_block, "Free Fire game cards must not render background images"
path.write_text(text, encoding="utf-8")
