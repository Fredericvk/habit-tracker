import SwiftUI

// MARK: - Color Palette

extension Color {
    static let theme = ThemeColors()
}

struct ThemeColors {
    let primary = Color(hex: "5B4CDB")       // Deep purple/indigo
    let secondary = Color(hex: "FFD166")      // Warm gold
    let background = Color(hex: "F7F8FA")     // Light grey bg
    let cardBackground = Color.white
    let success = Color(hex: "10B981")        // Green
    let warning = Color(hex: "F59E0B")        // Amber
    let danger = Color(hex: "EF4444")         // Red

    let textPrimary = Color(hex: "1F2937")
    let textSecondary = Color(hex: "6B7280")
    let textMuted = Color(hex: "9CA3AF")

    let tintPurple = Color(hex: "EDE9FF")
    let tintBlue = Color(hex: "EBF5FF")
    let tintGreen = Color(hex: "ECFDF5")
    let tintAmber = Color(hex: "FFFBEB")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = ((int >> 24) & 0xFF, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Typography

extension Font {
    static func interDisplay(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }

    static let screenTitle = interDisplay(28, weight: .bold)
    static let cardTitle = interDisplay(16, weight: .semibold)
    static let cardBody = interDisplay(14, weight: .regular)
    static let cardCaption = interDisplay(12, weight: .medium)
    static let statLarge = interDisplay(32, weight: .bold)
    static let statMedium = interDisplay(20, weight: .bold)
    static let statSmall = interDisplay(14, weight: .semibold)
    static let pillLabel = interDisplay(13, weight: .semibold)
}

// MARK: - Layout Constants

enum Layout {
    static let cardRadius: CGFloat = 20
    static let cardPadding: CGFloat = 16
    static let screenPadding: CGFloat = 20
    static let cardSpacing: CGFloat = 12
    static let pillRadius: CGFloat = 50
}

// MARK: - Card Style Modifier

struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(Layout.cardPadding)
            .background(Color.theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: Layout.cardRadius))
            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}

// MARK: - Segmented Pill Control

struct SegmentedPill: View {
    let segments: [String]
    @Binding var selected: Int

    var body: some View {
        HStack(spacing: 4) {
            ForEach(segments.indices, id: \.self) { index in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selected = index
                    }
                } label: {
                    Text(segments[index])
                        .font(.pillLabel)
                        .foregroundStyle(selected == index ? .white : Color.theme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(
                            selected == index
                                ? Color.theme.primary
                                : Color.clear
                        )
                        .clipShape(Capsule())
                }
            }
        }
        .padding(4)
        .background(Color.theme.background)
        .clipShape(Capsule())
    }
}
