import SwiftUI

struct DayView: View {
    @State private var selectedDate = Date()

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: Layout.cardSpacing) {
                // Date Navigation
                dateNavigation

                // Calories & Weight Card
                caloriesCard

                // Exercise Card
                exerciseCard

                // Side-by-side: Snacks + Alcohol
                HStack(spacing: Layout.cardSpacing) {
                    snacksCard
                    alcoholCard
                }
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
    }

    // MARK: - Date Navigation

    private var dateNavigation: some View {
        HStack {
            Button { moveDate(by: -1) } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.theme.primary)
            }

            Spacer()

            VStack(spacing: 2) {
                Text(selectedDate.formatted(.dateTime.weekday(.wide)))
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
                Text(selectedDate.formatted(.dateTime.day().month(.abbreviated)))
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }

            Spacer()

            Button { moveDate(by: 1) } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Calendar.current.isDateInToday(selectedDate) ? Color.theme.textMuted : Color.theme.primary)
            }
            .disabled(Calendar.current.isDateInToday(selectedDate))
        }
        .padding(.horizontal, 8)
    }

    // MARK: - Calories Card

    private var caloriesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundStyle(Color.theme.warning)
                Text("Calories & Weight")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
                Text("96.5 kg")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.theme.tintAmber)
                    .clipShape(Capsule())
            }

            // Progress bar
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("1,450")
                        .font(.statMedium)
                        .foregroundStyle(Color.theme.textPrimary)
                    Text("/ 2,300 kcal")
                        .font(.cardBody)
                        .foregroundStyle(Color.theme.textMuted)
                    Spacer()
                    Text("850 left")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.success)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.theme.background)
                            .frame(height: 10)
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.theme.success)
                            .frame(width: geo.size.width * 0.63, height: 10)
                    }
                }
                .frame(height: 10)
            }

            // Meal breakdown
            HStack(spacing: 0) {
                mealChip(label: "B", value: "420", color: Color.theme.tintBlue)
                Spacer()
                mealChip(label: "L", value: "650", color: Color.theme.tintGreen)
                Spacer()
                mealChip(label: "D", value: "380", color: Color.theme.tintPurple)
                Spacer()
                mealChip(label: "S", value: "0", color: Color.theme.tintAmber)
            }
        }
        .cardStyle()
    }

    private func mealChip(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.cardCaption)
                .foregroundStyle(Color.theme.textMuted)
            Text(value)
                .font(.statSmall)
                .foregroundStyle(Color.theme.textPrimary)
        }
        .frame(width: 60)
        .padding(.vertical, 8)
        .background(color)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Exercise Card

    private var exerciseCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "figure.run")
                    .foregroundStyle(Color.theme.primary)
                Text("Exercise")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
            }

            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Rest Day")
                        .font(.statSmall)
                        .foregroundStyle(Color.theme.textSecondary)
                    Text("No activity logged")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("0 min")
                        .font(.statSmall)
                        .foregroundStyle(Color.theme.textPrimary)
                    Text("0 kcal")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)
                }
            }
        }
        .cardStyle()
    }

    // MARK: - Snacks Card

    private var snacksCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "leaf.fill")
                    .foregroundStyle(Color.theme.success)
                    .font(.system(size: 14))
                Text("Snacks")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }

            Text("✅ Clean")
                .font(.statSmall)
                .foregroundStyle(Color.theme.success)

            Text("No snacks today")
                .font(.cardCaption)
                .foregroundStyle(Color.theme.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    // MARK: - Alcohol Card

    private var alcoholCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "drop.fill")
                    .foregroundStyle(Color.theme.warning)
                    .font(.system(size: 14))
                Text("Alcohol")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)
            }

            Text("0 units")
                .font(.statSmall)
                .foregroundStyle(Color.theme.textPrimary)

            Text("No drinks today")
                .font(.cardCaption)
                .foregroundStyle(Color.theme.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    // MARK: - Helpers

    private func moveDate(by days: Int) {
        withAnimation {
            selectedDate = Calendar.current.date(byAdding: .day, value: days, to: selectedDate) ?? selectedDate
        }
    }
}

#Preview {
    DayView()
}
