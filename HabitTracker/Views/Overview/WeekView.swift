import SwiftUI

struct WeekView: View {
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: Layout.cardSpacing) {
                // Week header
                HStack {
                    Text("Week of Apr 21")
                        .font(.cardTitle)
                        .foregroundStyle(Color.theme.textPrimary)
                    Spacer()
                    Text("Mon – Sun")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)
                }
                .padding(.horizontal, 4)

                // Donut ring cards in 2x2 grid
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: Layout.cardSpacing),
                    GridItem(.flexible(), spacing: Layout.cardSpacing)
                ], spacing: Layout.cardSpacing) {
                    donutCard(
                        title: "Calories",
                        icon: "flame.fill",
                        iconColor: Color.theme.warning,
                        value: "1,850",
                        subtitle: "avg kcal/day",
                        progress: 0.80,
                        ringColor: Color.theme.success
                    )

                    donutCard(
                        title: "Exercise",
                        icon: "figure.run",
                        iconColor: Color.theme.primary,
                        value: "3/7",
                        subtitle: "active days",
                        progress: 0.43,
                        ringColor: Color.theme.primary
                    )

                    donutCard(
                        title: "Snacking",
                        icon: "leaf.fill",
                        iconColor: Color.theme.success,
                        value: "4/5",
                        subtitle: "clean days",
                        progress: 0.80,
                        ringColor: Color.theme.success
                    )

                    donutCard(
                        title: "Alcohol",
                        icon: "drop.fill",
                        iconColor: Color.theme.warning,
                        value: "9.2",
                        subtitle: "/ 17 units",
                        progress: 0.54,
                        ringColor: Color.theme.warning
                    )
                }

                // Weight progress
                weightCard
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
    }

    // MARK: - Donut Ring Card

    private func donutCard(title: String, icon: String, iconColor: Color, value: String, subtitle: String, progress: Double, ringColor: Color) -> some View {
        VStack(spacing: 10) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .foregroundStyle(iconColor)
                    .font(.system(size: 12))
                Text(title)
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textSecondary)
            }

            ZStack {
                Circle()
                    .stroke(Color.theme.background, lineWidth: 6)
                    .frame(width: 64, height: 64)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(ringColor, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 64, height: 64)
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 0) {
                    Text(value)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.theme.textPrimary)
                }
            }

            Text(subtitle)
                .font(.system(size: 11))
                .foregroundStyle(Color.theme.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .cardStyle()
    }

    // MARK: - Weight Card

    private var weightCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "scalemass.fill")
                    .foregroundStyle(Color.theme.primary)
                Text("Weight")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Text("Goal: 93.0 kg")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
            }

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("96.5")
                    .font(.statLarge)
                    .foregroundStyle(Color.theme.textPrimary)
                Text("kg")
                    .font(.cardBody)
                    .foregroundStyle(Color.theme.textMuted)
                Spacer()
                Text("3.5 kg to go")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.primary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.theme.tintPurple)
                    .clipShape(Capsule())
            }

            // Weight progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.theme.background)
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.theme.primary)
                        .frame(width: geo.size.width * 0.5, height: 8)
                }
            }
            .frame(height: 8)
        }
        .cardStyle()
    }
}

#Preview {
    WeekView()
}
