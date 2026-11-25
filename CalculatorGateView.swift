import SwiftUI
import UIKit

private struct CalculatorGateView: View {
    let onUnlock: () -> Void
    @State private var display = "0"
    @State private var storedValue: Double?
    @State private var pendingOperator: String?
    private let rows: [[String]] = [
        ["⌫", "AC", "%", "÷"],
        ["7", "8", "9", "×"],
        ["4", "5", "6", "−"],
        ["1", "2", "3", "+"],
        ["+/−", "0", ",", "="]
    ]
    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .top) {
                Color.black.ignoresSafeArea()
                VStack(spacing: 0) {
                    HStack {
                        Image(systemName: "clock")
                            .font(.system(size: 22, weight: .regular))
                            .foregroundStyle(.white.opacity(0.92))
                            .frame(width: 38, height: 38)
                            .background(Color(white: 0.09), in: Circle())
                            .overlay(Circle().stroke(Color.white.opacity(0.12), lineWidth: 1))
                        Spacer()
                        CalculatorGlyph()
                            .frame(width: 38, height: 38)
                            .background(Color(white: 0.09), in: Circle())
                            .overlay(Circle().stroke(Color.white.opacity(0.12), lineWidth: 1))
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, max(28, proxy.safeAreaInsets.top + 12))
                    .frame(height: 92, alignment: .top)
                    Text(display)
                        .font(.system(size: 56, weight: .regular, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.35)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .padding(.horizontal, 36)
                        .frame(height: 210, alignment: .bottom)
                        .padding(.bottom, 18)
                    let keySide = min(180, (proxy.size.width - 28 - 21) / 4)
                    LazyVGrid(columns: Array(repeating: GridItem(.fixed(keySide), spacing: 7), count: 4), spacing: 7) {
                        ForEach(rows.flatMap { $0 }, id: \.self) { symbol in
                            CalculatorKey(symbol: symbol, side: keySide, isOperator: isOperator(symbol), isUtility: isUtility(symbol)) {
                                press(symbol)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, max(26, proxy.safeAreaInsets.bottom + 10))
                }
                ThreeFingerDoubleTapRecognizer(onRecognized: onUnlock)
                    .frame(width: 1, height: 1)
                    .allowsHitTesting(false)
            }
        }
        .preferredColorScheme(.dark)
    }
    private func isOperator(_ symbol: String) -> Bool { ["÷", "×", "−", "+", "="].contains(symbol) }
    private func isUtility(_ symbol: String) -> Bool { ["⌫", "AC", "%"].contains(symbol) }
    private func press(_ symbol: String) {
        switch symbol {
        case "AC": display = "0"; storedValue = nil; pendingOperator = nil
        case "⌫": display = display.count > 1 ? String(display.dropLast()) : "0"
        case "%": if let value = Double(display.replacingOccurrences(of: ",", with: ".")) { display = format(value / 100) }
        case "+/−": if display != "0" { display = display.hasPrefix("−") ? String(display.dropFirst()) : "−" + display }
        case ",": if !display.contains(",") { display += "," }
        case "÷", "×", "−", "+": storedValue = Double(display.replacingOccurrences(of: ",", with: ".")); pendingOperator = symbol; display = "0"
        case "=":
            guard let left = storedValue, let operation = pendingOperator, let right = Double(display.replacingOccurrences(of: ",", with: ".")) else { return }
            let result: Double
            switch operation { case "+": result = left + right; case "−": result = left - right; case "×": result = left * right; default: result = right == 0 ? 0 : left / right }
            display = format(result); storedValue = nil; pendingOperator = nil
        default: if symbol.allSatisfy({ $0.isNumber }) { display = display == "0" ? symbol : display + symbol }
        }
    }
    private func format(_ value: Double) -> String {
        let rounded = abs(value.rounded() - value) < 0.0000001 ? String(Int(value.rounded())) : String(format: "%.6f", value).replacingOccurrences(of: ".", with: ",")
        return rounded
    }
}

private struct ThreeFingerDoubleTapRecognizer: UIViewRepresentable {
    let onRecognized: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onRecognized: onRecognized) }

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .clear
        DispatchQueue.main.async {
            context.coordinator.install(on: view.window)
        }
        return view
    }

    func updateUIView(_ view: UIView, context: Context) {
        context.coordinator.onRecognized = onRecognized
        context.coordinator.install(on: view.window)
    }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var onRecognized: () -> Void
        private weak var installedWindow: UIWindow?
        private var recognizer: UITapGestureRecognizer?

        init(onRecognized: @escaping () -> Void) {
            self.onRecognized = onRecognized
        }

        func install(on window: UIWindow?) {
            guard let window, installedWindow !== window else { return }
            if let recognizer, let oldWindow = installedWindow {
                oldWindow.removeGestureRecognizer(recognizer)
            }
            let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap))
            tap.numberOfTapsRequired = 2
            tap.numberOfTouchesRequired = 3
            tap.cancelsTouchesInView = false
            tap.delegate = self
            window.addGestureRecognizer(tap)
            installedWindow = window
            recognizer = tap
        }

        @objc private func handleTap() {
            onRecognized()
        }

        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
            true
        }
    }
}

private struct CalculatorKey: View {
    let symbol: String
    let side: CGFloat
    let isOperator: Bool
    let isUtility: Bool
    let action: () -> Void
    private var keyColor: Color {
        if isOperator { return Color(red: 1.0, green: 0.584, blue: 0.0) }
        if isUtility { return Color(red: 0.36, green: 0.36, blue: 0.38) }
        return Color(red: 0.18, green: 0.18, blue: 0.20)
    }
    var body: some View {
        Button(action: action) {
            label
                .font(.system(size: symbol == "⌫" ? 34 : (symbol == "AC" ? 35 : 40), weight: .regular, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: side, height: side)
                .background(keyColor, in: Circle())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var label: some View {
        switch symbol {
        case "⌫": Image(systemName: "delete.left")
        case "+/−": Image(systemName: "plus.slash.minus")
        case "÷": Image(systemName: "divide")
        case "×": Image(systemName: "multiply")
        case "−": Image(systemName: "minus")
        case "+": Image(systemName: "plus")
        case "=": Image(systemName: "equal")
        default: Text(symbol)
        }
    }
}

private struct CalculatorGlyph: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(Color.white)
                .frame(width: 22, height: 25)
            VStack(spacing: 3) {
                RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                    .fill(Color.black.opacity(0.82))
                    .frame(width: 14, height: 5)
                HStack(spacing: 2) {
                    ForEach(0..<3, id: \.self) { _ in
                        Circle().fill(Color.black.opacity(0.80)).frame(width: 3, height: 3)
                    }
                }
                HStack(spacing: 2) {
                    ForEach(0..<3, id: \.self) { _ in
                        Circle().fill(Color.black.opacity(0.80)).frame(width: 3, height: 3)
                    }
                }
            }
        }
    }
}
