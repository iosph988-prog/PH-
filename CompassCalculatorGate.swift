import SwiftUI
import UIKit

private struct CompassGateView: View {
    let onUnlock: () -> Void

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                Color.black.ignoresSafeArea()
                VStack(spacing: 0) {
                    HStack {
                        Image(systemName: "location.north.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.red)
                        Text("BÚSSOLA")
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .tracking(1.4)
                            .foregroundStyle(.white)
                        Spacer()
                        Text("NÍVEL")
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .tracking(1.0)
                            .foregroundStyle(Color.white.opacity(0.48))
                    }
                    .padding(.horizontal, 22)
                    .padding(.top, max(18, proxy.safeAreaInsets.top + 4))
                    .padding(.bottom, 26)

                    CompassDial()
                        .frame(width: min(proxy.size.width - 42, 350), height: min(proxy.size.width - 42, 350))

                    Text("245° SO")
                        .font(.system(size: 48, weight: .regular, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.top, 24)
                    Text("Norte magnético")
                        .font(.system(size: 15, weight: .medium, design: .rounded))
                        .foregroundStyle(Color.white.opacity(0.58))
                        .padding(.top, 2)
                    Text("Aponte o aparelho para uma direção")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(Color.white.opacity(0.42))
                        .padding(.top, 9)

                    Spacer(minLength: 20)
                    VStack(spacing: 8) {
                        Image(systemName: "hand.tap.fill")
                            .font(.system(size: 25, weight: .semibold))
                            .foregroundStyle(.red)
                        Text("Toque duas vezes com três dedos")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text("para abrir a calculadora")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(Color.white.opacity(0.52))
                    }
                    .multilineTextAlignment(.center)
                    .padding(.bottom, max(28, proxy.safeAreaInsets.bottom + 12))
                }
                ThreeFingerDoubleTapView(action: onUnlock)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .preferredColorScheme(.dark)
    }
}

private struct CompassDial: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(Color(white: 0.035))
                .overlay(Circle().stroke(Color.white.opacity(0.22), lineWidth: 1))
            ForEach(0..<36, id: \.self) { index in
                Rectangle()
                    .fill(index % 3 == 0 ? Color.white.opacity(0.76) : Color.white.opacity(0.32))
                    .frame(width: index % 3 == 0 ? 2 : 1, height: index % 3 == 0 ? 16 : 9)
                    .offset(y: -146)
                    .rotationEffect(.degrees(Double(index) * 10))
            }
            ForEach(Array(["N", "L", "S", "O"].enumerated()), id: \.offset) { index, point in
                Text(point)
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(index == 0 ? .red : .white)
                    .offset(y: -116)
                    .rotationEffect(.degrees(Double(index) * 90))
            }
            Circle()
                .stroke(Color.white.opacity(0.14), lineWidth: 1)
                .frame(width: 205, height: 205)
            VStack(spacing: 0) {
                Image(systemName: "triangle.fill")
                    .font(.system(size: 31, weight: .bold))
                    .foregroundStyle(.red)
                    .rotationEffect(.degrees(180))
                Rectangle()
                    .fill(Color.white.opacity(0.85))
                    .frame(width: 2, height: 102)
            }
            Circle()
                .fill(Color(white: 0.18))
                .frame(width: 68, height: 68)
                .overlay(Circle().stroke(Color.white.opacity(0.5), lineWidth: 1))
                .overlay {
                    Path { path in
                        path.move(to: CGPoint(x: 16, y: 34))
                        path.addLine(to: CGPoint(x: 52, y: 34))
                        path.move(to: CGPoint(x: 34, y: 16))
                        path.addLine(to: CGPoint(x: 34, y: 52))
                    }
                    .stroke(Color.white.opacity(0.85), lineWidth: 1)
                }
        }
        .shadow(color: .red.opacity(0.14), radius: 20)
    }
}

private struct ThreeFingerDoubleTapView: UIViewRepresentable {
    let action: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(action: action) }

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = true
        let gesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.recognized))
        gesture.numberOfTouchesRequired = 3
        gesture.numberOfTapsRequired = 2
        view.addGestureRecognizer(gesture)
        return view
    }

    func updateUIView(_ view: UIView, context: Context) {
        context.coordinator.action = action
    }

    final class Coordinator: NSObject {
        var action: () -> Void
        init(action: @escaping () -> Void) { self.action = action }
        @objc func recognized() { action() }
    }
}

private struct CalculatorGateView: View {
    let onUnlock: () -> Void
    @State private var display = "0"
    @State private var unlockStep = 0
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
                    .padding(.top, max(18, proxy.safeAreaInsets.top + 2))
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
            }
        }
        .preferredColorScheme(.dark)
    }
    private func isOperator(_ symbol: String) -> Bool { ["÷", "×", "−", "+", "="].contains(symbol) }
    private func isUtility(_ symbol: String) -> Bool { ["⌫", "AC", "%"].contains(symbol) }
    private func press(_ symbol: String) {
        if symbol == "×" && unlockStep == 0 { unlockStep = 1 }
        else if symbol == "−" && unlockStep == 1 { unlockStep = 2; onUnlock() }
        else if symbol != "×" && symbol != "−" { unlockStep = 0 }
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

private struct CalculatorKey: View {
    let symbol: String
    let side: CGFloat
    let isOperator: Bool
    let isUtility: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Group {
                if symbol == "⌫" { Image(systemName: "delete.left") }
                else if symbol == "+/−" { Image(systemName: "plus.slash.minus") }
                else { Text(symbol) }
            }
            .font(.system(size: symbol == "⌫" ? 34 : (symbol == "AC" ? 35 : 40), weight: .regular, design: .rounded))
            .foregroundStyle(.white)
            .frame(width: side, height: side)
            .background(isOperator && !isUtility ? Color.orange : (isUtility ? Color(white: 0.38) : Color(white: 0.20)), in: Circle())
        }
        .buttonStyle(.plain)
    }
}

private struct CalculatorGlyph: View {
    var body: some View {
        VStack(spacing: 2) {
            RoundedRectangle(cornerRadius: 2).stroke(.white, lineWidth: 2).frame(width: 18, height: 13)
            HStack(spacing: 2) { ForEach(0..<3, id: \.self) { _ in Circle().fill(.white).frame(width: 3, height: 3) } }
            HStack(spacing: 2) { ForEach(0..<3, id: \.self) { _ in Circle().fill(.white).frame(width: 3, height: 3) } }
        }
    }
}
