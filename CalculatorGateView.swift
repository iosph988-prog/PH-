import SwiftUI
import UIKit

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
