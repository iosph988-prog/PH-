#!/usr/bin/env python3
"""Add a Config tab, move live profile metrics there, and share a background palette across tabs."""
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit("usage: config_panel_patch.py <ThreeOneOSFive source directory>")
app = Path(sys.argv[1])
patch_file = app / "views/PatchProjectsView.swift"
texture_file = app / "views/TextureOnlineView.swift"
content_file = app / "ContentView.swift"
nav_file = app / "helpers/AppTabNavigationState.swift"
for path in (patch_file, texture_file, content_file, nav_file):
    if not path.is_file():
        raise SystemExit(f"required source file missing: {path}")


def add_app_storage(source: str, struct_name: str) -> str:
    pattern = re.compile(rf"(?m)^(?P<indent>[ \t]*)struct {re.escape(struct_name)}: View \{{\s*$")
    match = pattern.search(source)
    if not match:
        raise SystemExit(f"view not found: {struct_name}")
    start = match.start()
    next_struct = source.find("\nstruct ", match.end())
    block_end = len(source) if next_struct < 0 else next_struct
    block = source[start:block_end]
    if '@AppStorage("globalAppBackgroundHex")' in block:
        return source
    insertion = match.end()
    line = '\n' + match.group("indent") + '    @AppStorage("globalAppBackgroundHex") private var globalAppBackgroundHex = "05070A"'
    return source[:insertion] + line + source[insertion:]


swift = patch_file.read_text()
# Add a persistent, shared color preference to each view that paints a page background.
# The workflow also concatenates TextureOnlineView into PatchProjectsView.swift.
for view_name in ("PatchProjectsView", "ExternalPanelView", "TextureOnlineView", "MiscToolsView"):
    swift = add_app_storage(swift, view_name)

# Keep the external online categories available there, but move its Profile category to Config.
old_profile_case = '        case profile = "Perfil"\n        var id: String { rawValue }'
new_profile_case = '        case profile = "Perfil"\n        static var allCases: [Category] { [.functions, .esp, .tools] }\n        var id: String { rawValue }'
if new_profile_case not in swift:
    if old_profile_case not in swift:
        raise SystemExit("External category declaration not found")
    swift = swift.replace(old_profile_case, new_profile_case, 1)
# The external panel no longer polls FPS or key validity while its profile page is hidden.
swift = swift.replace("            fpsMonitor.start()\n", "", 1)
swift = swift.replace("                await refreshProfile()\n", "", 1)
swift = swift.replace("        .onDisappear { fpsMonitor.stop() }\n", "", 1)

# Shared page backgrounds: PROXY, its catalog/action surface, External, and MISC.
old_proxy_gradient = '(darkMode ? LinearGradient(colors: [Color.black, Color(red: 0.035, green: 0.045, blue: 0.055)], startPoint: .top, endPoint: .bottom) : LinearGradient(colors: [Color.white, Color(red: 0.91, green: 0.94, blue: 0.97)], startPoint: .top, endPoint: .bottom)).ignoresSafeArea()'
if old_proxy_gradient not in swift:
    raise SystemExit("PROXY page background anchor not found")
swift = swift.replace(old_proxy_gradient, "configBackgroundColor(hex: globalAppBackgroundHex).ignoresSafeArea()", 1)
swift = swift.replace("Color(red: 0.018, green: 0.020, blue: 0.027)", "configBackgroundColor(hex: globalAppBackgroundHex)")
page_bg_pattern = re.compile(r"(?m)^(?P<indent>[ \t]*)private var pageBackground: Color \{[^\n]*\}$")
swift, page_bg_count = page_bg_pattern.subn(
    lambda m: m.group("indent") + "private var pageBackground: Color { configBackgroundColor(hex: globalAppBackgroundHex) }",
    swift,
    count=1,
)
if page_bg_count != 1:
    raise SystemExit("External page background anchor not found")
old_misc_bg = "private let background = Color(red: 0.025, green: 0.025, blue: 0.035)"
if old_misc_bg not in swift:
    raise SystemExit("MISC background anchor not found")
swift = swift.replace(old_misc_bg, "private var background: Color { configBackgroundColor(hex: globalAppBackgroundHex) }", 1)
swift = swift.replace('Image(systemName: "paintbrush.pointed.fill")', 'Image(systemName: "paintpalette.fill")', 1)

# Hide Profile from External's sidebar; the live status/profile content now lives in Config.
patch_file.write_text(swift)

texture = texture_file.read_text()
texture = add_app_storage(texture, "TextureOnlineView")
texture_bg = "Color(red: 0.018, green: 0.020, blue: 0.027)"
if texture.count(texture_bg) < 2:
    raise SystemExit("TEXTURA background anchors not found")
texture = texture.replace(texture_bg, "configBackgroundColor(hex: globalAppBackgroundHex)")
texture = texture.replace('Image(systemName: "paintbrush.pointed.fill")', 'Image(systemName: "paintpalette.fill")', 1)
texture_file.write_text(texture)

# Add AppSection.config and expose it in the generated ContentView navigation.
nav = nav_file.read_text()
if "    case config\n" not in nav:
    if "    case misc\n" not in nav:
        raise SystemExit("MISC enum case not found")
    nav = nav.replace("    case misc\n", "    case misc\n    case config\n", 1)
nav = nav.replace(
    "[.patches, .external, .texture, .misc].filter(isVisible)",
    "[.patches, .external, .texture, .misc, .config].filter(isVisible)",
)
nav = nav.replace(
    "case .home, .files, .patches, .external, .texture, .misc:",
    "case .home, .files, .patches, .external, .texture, .misc, .config:",
)
nav_file.write_text(nav)

content = content_file.read_text()
if "case .config:\n            ConfigPanelView()" not in content:
    case_pattern = re.compile(
        r"(?m)^(?P<case>[ \t]*)case \.misc:[ \t]*(?:\n(?P<child>[ \t]*))?MiscToolsView\(\)"
    )
    match = case_pattern.search(content)
    if not match:
        raise SystemExit("ContentView MISC destination case not found")
    child_indent = match.group("child") or match.group("case") + "    "
    replacement = (
        match.group("case") + "case .misc:\n" + child_indent + "MiscToolsView()\n"
        + match.group("case") + "case .config:\n" + child_indent + "ConfigPanelView()"
    )
    content = content[:match.start()] + replacement + content[match.end():]
content = content.replace(
    "[.patches, .external, .texture, .misc].filter(isVisible)",
    "[.patches, .external, .texture, .misc, .config].filter(isVisible)",
)
content = content.replace(
    "[AppSection.patches, .external, .texture, .misc]",
    "[AppSection.patches, .external, .texture, .misc, .config]",
)
content = content.replace(
    "ForEach([AppSection.patches, .external, .texture, .misc])",
    "ForEach([AppSection.patches, .external, .texture, .misc, .config])",
)
# Insert the fifth compact tab after MISC.
if 'sectionContent(.config)' not in content:
    tab_pattern = re.compile(
        r'(?m)^(?P<i1>[ \t]*)sectionContent\(\.misc\)\n'
        r'(?P<i2>[ \t]*)\.tabItem \{ CompactTabLabel\(title: "MISC", systemImage: "eye\.fill"\) \}\n'
        r'(?P<i3>[ \t]*)\.tag\(AppSection\.misc\.rawValue\)'
    )
    match = tab_pattern.search(content)
    if not match:
        raise SystemExit("MISC compact tab anchor not found")
    new_tab = (
        match.group(0)
        + "\n" + match.group("i1") + "sectionContent(.config)"
        + "\n" + match.group("i2") + '.tabItem { CompactTabLabel(title: "Config", systemImage: "gearshape.fill") }'
        + "\n" + match.group("i3") + ".tag(AppSection.config.rawValue)"
    )
    content = content[:match.start()] + new_tab + content[match.end():]
# Keep the regular-size navigation labels exhaustive and readable.
if 'case .config: return "Config"' not in content:
    content = content.replace('case .misc: return "MISC"', 'case .misc: return "MISC"\n        case .config: return "Config"', 1)
if 'case .config: return "gearshape.fill"' not in content:
    content = content.replace('case .misc: return "eye.fill"', 'case .misc: return "eye.fill"\n        case .config: return "gearshape.fill"', 1)
content = content.replace('title: language.text(section.titleKey)', 'title: section == .config ? "Config" : language.text(section.titleKey)')
content = content.replace('Label(language.text(section.titleKey), systemImage: section.systemImage)', 'Label(section == .config ? "Config" : language.text(section.titleKey), systemImage: section.systemImage)')
content = content.replace(
    'CompactTabLabel(title: "TEXTURA", systemImage: "paintbrush.fill")',
    'CompactTabLabel(title: "TEXTURA", systemImage: "paintpalette.fill")',
)
content = content.replace('case .texture: return "paintbrush.fill"', 'case .texture: return "paintpalette.fill"', 1)
old_tab_icon = 'Image(systemName: systemImage)'
new_tab_icon = '''Group {
                if title == "TEXTURA" {
                    ZStack(alignment: .bottomTrailing) {
                        Image(systemName: "paintpalette.fill")
                        Image(systemName: "paintbrush.pointed.fill")
                            .font(.system(size: 9, weight: .bold))
                            .rotationEffect(.degrees(25))
                            .offset(x: 3, y: -3)
                    }
                } else {
                    Image(systemName: systemImage)
                }
            }'''
if old_tab_icon not in content:
    raise SystemExit("CompactTabLabel icon anchor not found")
content = content.replace(old_tab_icon, new_tab_icon, 1)
content_file.write_text(content)

config_swift = r'''

private struct ConfigBackgroundChoice: Identifiable {
    let title: String
    let hex: String
    var id: String { hex }
}

func configBackgroundColor(hex rawValue: String) -> Color {
    let cleaned = rawValue.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "#", with: "")
    guard cleaned.count == 6, let value = UInt32(cleaned, radix: 16) else {
        return Color(red: 0.020, green: 0.027, blue: 0.040)
    }
    return Color(
        red: Double((value >> 16) & 0xFF) / 255.0,
        green: Double((value >> 8) & 0xFF) / 255.0,
        blue: Double(value & 0xFF) / 255.0
    )
}

struct ConfigPanelView: View {
    @AppStorage("globalAppBackgroundHex") private var globalAppBackgroundHex = "05070A"
    @StateObject private var fpsMonitor = ExternalFPSMonitor()
    @State private var licenseExpiresAt: Date?

    private let backgroundChoices = [
        ConfigBackgroundChoice(title: "Preto", hex: "05070A"),
        ConfigBackgroundChoice(title: "Azul", hex: "0A1428"),
        ConfigBackgroundChoice(title: "Roxo", hex: "1B1230"),
        ConfigBackgroundChoice(title: "Verde", hex: "0C241C"),
        ConfigBackgroundChoice(title: "Vinho", hex: "2A1119"),
        ConfigBackgroundChoice(title: "Cinza", hex: "22262D"),
        ConfigBackgroundChoice(title: "Azul profundo", hex: "0B1B35"),
        ConfigBackgroundChoice(title: "Petróleo", hex: "0D2830"),
        ConfigBackgroundChoice(title: "Turquesa escuro", hex: "12332F"),
        ConfigBackgroundChoice(title: "Oliva", hex: "26291B"),
        ConfigBackgroundChoice(title: "Marrom", hex: "2D1B13"),
        ConfigBackgroundChoice(title: "Ardósia", hex: "2B3442")
    ]

    init() {
        let cachedExpiry = LicenseStore.profileSnapshot.flatMap { snapshot -> Date? in
            guard let raw = snapshot.expiresAt else { return nil }
            return Self.parseISODate(raw)
        }
        _licenseExpiresAt = State(initialValue: cachedExpiry)
    }

    var body: some View {
        ZStack {
            configBackgroundColor(hex: globalAppBackgroundHex).ignoresSafeArea()
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    appearanceSection
                    performanceSection
                    profileSection
                }
                .padding(.horizontal, 18)
                .padding(.top, 20)
                .padding(.bottom, 34)
            }
        }
        .task {
            fpsMonitor.start()
            await refreshLicense()
        }
        .onDisappear { fpsMonitor.stop() }
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        HStack(spacing: 12) {
            Image(systemName: "gearshape.fill")
                .font(.system(size: 23, weight: .bold))
                .foregroundStyle(Color(red: 0.38, green: 0.72, blue: 1.0))
                .frame(width: 48, height: 48)
                .background(Color.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text("Config")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                Text("Aparência, dispositivo e perfil")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.58))
            }
            Spacer()
        }
    }

    private var appearanceSection: some View {
        sectionCard("Aparência") {
            VStack(alignment: .leading, spacing: 12) {
                Text("Cor de fundo de todas as abas")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.84))
                Text("A cor escolhida é salva neste dispositivo e aplicada em PROXY, External, TEXTURA, MISC e Config.")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.55))
                    .fixedSize(horizontal: false, vertical: true)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 9) {
                    ForEach(backgroundChoices) { choice in
                        let isSelected = globalAppBackgroundHex.uppercased() == choice.hex
                        Button {
                            withAnimation(.easeInOut(duration: 0.18)) {
                                globalAppBackgroundHex = choice.hex
                            }
                        } label: {
                            VStack(spacing: 7) {
                                Circle()
                                    .fill(configBackgroundColor(hex: choice.hex))
                                    .frame(width: 30, height: 30)
                                    .overlay(Circle().stroke(Color.white.opacity(0.55), lineWidth: 1))
                                    .overlay {
                                        if isSelected {
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 12, weight: .black))
                                                .foregroundStyle(.white)
                                        }
                                    }
                                Text(choice.title)
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(Color.white.opacity(0.82))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 9)
                            .background(Color.white.opacity(0.045), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).stroke(isSelected ? Color.white.opacity(0.68) : Color.white.opacity(0.10), lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Selecionar fundo \(choice.title)")
                    }
                }
            }
        }
    }

    private var performanceSection: some View {
        sectionCard("Dispositivo e desempenho") {
            VStack(spacing: 9) {
                infoRow(icon: "speedometer", title: "FPS", value: "\(fpsMonitor.fps) FPS", detail: "Atualização em tempo real")
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    infoRow(icon: "clock.fill", title: "Horário de Brasília", value: brasiliaTime(at: context.date), detail: "America/Sao_Paulo")
                }
            }
        }
    }

    private var profileSection: some View {
        sectionCard("Perfil") {
            VStack(spacing: 9) {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    infoRow(icon: "hourglass.bottomhalf.filled", title: "Validade da key", value: remainingLicenseText(at: context.date), detail: "Atualização em tempo real")
                }
                infoRow(icon: "iphone", title: "Dispositivo", value: "\(UIDevice.current.model) • \(UIDevice.current.name)", detail: "iOS \(UIDevice.current.systemVersion)")
            }
        }
    }

    private func sectionCard<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 15, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            content()
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.075), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.white.opacity(0.12), lineWidth: 1))
    }

    private func infoRow(icon: String, title: String, value: String, detail: String) -> some View {
        HStack(spacing: 11) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color(red: 0.38, green: 0.72, blue: 1.0))
                .frame(width: 30, height: 30)
                .background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(size: 11, weight: .semibold)).foregroundStyle(Color.white.opacity(0.58))
                Text(value).font(.system(size: 14, weight: .bold, design: .rounded)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.72)
                Text(detail).font(.system(size: 9, weight: .medium)).foregroundStyle(Color.white.opacity(0.48)).lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 15, style: .continuous).stroke(Color.white.opacity(0.09), lineWidth: 1))
    }

    private func brasiliaTime(at date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.timeZone = TimeZone(identifier: "America/Sao_Paulo")
        formatter.dateFormat = "HH:mm:ss"
        return formatter.string(from: date)
    }

    private func remainingLicenseText(at now: Date) -> String {
        guard let expiresAt = licenseExpiresAt else { return "Aguardando ativação" }
        let seconds = max(0, Int(expiresAt.timeIntervalSince(now)))
        if seconds == 0 { return "Expirada" }
        let days = seconds / 86_400
        let hours = (seconds % 86_400) / 3_600
        let minutes = (seconds % 3_600) / 60
        let secs = seconds % 60
        if days > 0 { return "\(days)d \(hours)h \(minutes)min \(secs)s" }
        if hours > 0 { return "\(hours)h \(minutes)min \(secs)s" }
        return "\(minutes)min \(secs)s"
    }

    private static func parseISODate(_ raw: String) -> Date? {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return parser.date(from: raw) ?? ISO8601DateFormatter().date(from: raw)
    }

    private func refreshLicense() async {
        guard let key = LicenseStore.storedKey, !key.isEmpty else { return }
        do {
            let response = try await LicenseAPI.validate(key: key)
            if response.valid, let raw = response.expiresAt, let date = Self.parseISODate(raw) {
                await MainActor.run { licenseExpiresAt = date }
            } else if !response.valid {
                await MainActor.run { licenseExpiresAt = nil }
            }
        } catch {
            // Keep the last locally cached expiry if the API is temporarily unavailable.
        }
    }
}
'''
if "struct ConfigPanelView: View" not in patch_file.read_text():
    with patch_file.open("a") as handle:
        handle.write(config_swift)

print("Config patch applied")
print("views:", patch_file, texture_file, content_file, nav_file)
