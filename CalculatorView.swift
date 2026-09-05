import SwiftUI

struct CalculatorView: View {
    @State private var display = "0"
    @State private var storedValue: Decimal?
    @State private var pendingOperation: Operation?
    @State private var startsNewNumber = true

    private enum Operation { case add, subtract, multiply, divide }
    private let rows = [["⌫", "AC", "%", "÷"], ["7", "8", "9", "×"], ["4", "5", "6", "−"], ["1", "2", "3", "+"], ["+/−", "0", ",", "="]]

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                Color.black.ignoresSafeArea()
                VStack(spacing: 0) {
                    HStack {
                        Button(action: {}) { Image(systemName: "clock").font(.system(size: 24, weight: .regular)) }
                            .buttonStyle(TopButtonStyle())
                        Spacer()
                        Button(action: {}) { Image(systemName: "calculator").font(.system(size: 24, weight: .regular)) }
                            .buttonStyle(TopButtonStyle())
                    }
                    .padding(.horizontal, 34)
                    .padding(.top, 8)

                    Spacer(minLength: 24)
                    HStack { Spacer(); Text(display).font(.system(size: 72, weight: .regular, design: .rounded)).foregroundStyle(.white).minimumScaleFactor(0.5) }
                        .padding(.horizontal, 44)
                        .padding(.bottom, 32)

                    VStack(spacing: 14) {
                        ForEach(rows.indices, id: \.self) { row in
                            HStack(spacing: 14) {
                                ForEach(rows[row], id: \.self) { item in
                                    CalculatorButton(label: item, isOperator: row > 0 && item == rows[row].last, isAction: row == 0 && item != "÷") {
                                        handle(item)
                                    }
                                    .frame(width: buttonSize(proxy.size.width), height: buttonSize(proxy.size.width))
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 28)
                    .padding(.bottom, 8)
                }
            }
        }
    }

    private func buttonSize(_ width: CGFloat) -> CGFloat { min(86, (width - 56 - 42) / 4) }

    private func handle(_ key: String) {
        switch key {
        case "AC": display = "0"; storedValue = nil; pendingOperation = nil; startsNewNumber = true
        case "⌫": if display.count > 1 { display.removeLast() } else { display = "0" }
        case "+/−": if display != "0" { display = display.hasPrefix("−") ? String(display.dropFirst()) : "−" + display }
        case "%": if let n = Decimal(string: display.replacingOccurrences(of: ",", with: ".")) { display = format(n / 100) }
        case "+", "−", "×", "÷":
            storedValue = Decimal(string: display.replacingOccurrences(of: ",", with: ".")); startsNewNumber = true
            pendingOperation = ["+": .add, "−": .subtract, "×": .multiply, "÷": .divide][key]
        case "=":
            guard let a = storedValue, let op = pendingOperation, let b = Decimal(string: display.replacingOccurrences(of: ",", with: ".")) else { return }
            var result = a
            switch op { case .add: result += b; case .subtract: result -= b; case .multiply: result *= b; case .divide: if b != 0 { result /= b } }
            display = format(result); storedValue = nil; pendingOperation = nil; startsNewNumber = true
        case ",": if !display.contains(",") { display += "," }
        default:
            if startsNewNumber || display == "0" { display = key; startsNewNumber = false } else { display += key }
        }
    }

    private func format(_ value: Decimal) -> String {
        let formatter = NumberFormatter(); formatter.locale = Locale(identifier: "pt_BR"); formatter.maximumFractionDigits = 8; formatter.minimumFractionDigits = 0
        return formatter.string(from: value as NSDecimalNumber) ?? "0"
    }
}

private struct TopButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.foregroundStyle(.white).frame(width: 60, height: 60).background(Color(white: 0.10)).clipShape(Circle()).opacity(configuration.isPressed ? 0.65 : 1)
    }
}

private struct CalculatorButton: View {
    let label: String; let isOperator: Bool; let isAction: Bool; let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(label).font(.system(size: label == "⌫" ? 26 : 38, weight: .regular, design: .rounded)).minimumScaleFactor(0.55).foregroundStyle(isOperator || isAction ? .white : .white)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(isOperator ? Color.orange : (isAction ? Color(white: 0.70) : Color(white: 0.18)))
        .clipShape(Circle())
    }
}
