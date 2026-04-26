import SwiftUI

struct LogScreen: View {
    @State private var selectedSegment = 0
    private let segments = ["Food", "Drink", "Weight"]

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Log")
                    .font(.screenTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 16)

            // Segmented Control
            SegmentedPill(segments: segments, selected: $selectedSegment)
                .padding(.horizontal, Layout.screenPadding)
                .padding(.top, 12)

            // Content
            ScrollView(showsIndicators: false) {
                Group {
                    switch selectedSegment {
                    case 0: foodLog
                    case 1: drinkLog
                    case 2: weightLog
                    default: EmptyView()
                    }
                }
                .padding(.horizontal, Layout.screenPadding)
                .padding(.top, 16)
                .padding(.bottom, 100)
            }

            Spacer(minLength: 0)
        }
        .background(Color.theme.background)
    }

    // MARK: - Food Log

    private var foodLog: some View {
        VStack(spacing: Layout.cardSpacing) {
            // Input mode toggle
            HStack(spacing: 12) {
                modeButton(icon: "pencil", label: "Manual", isSelected: true)
                modeButton(icon: "camera.fill", label: "Photo", isSelected: false)
            }

            // Meal type selector
            VStack(alignment: .leading, spacing: 10) {
                Text("Meal")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)

                HStack(spacing: 8) {
                    ForEach(MealType.allCases, id: \.self) { meal in
                        mealTypeButton(meal: meal, isSelected: meal == .lunch)
                    }
                }
            }
            .cardStyle()

            // Food input
            VStack(alignment: .leading, spacing: 10) {
                Text("What did you eat?")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)

                TextField("e.g., Grilled chicken with rice", text: .constant(""))
                    .textFieldStyle(.plain)
                    .padding(12)
                    .background(Color.theme.background)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                HStack {
                    Text("Est. Calories")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)
                    Spacer()
                    TextField("kcal", text: .constant(""))
                        .textFieldStyle(.plain)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                        .padding(8)
                        .background(Color.theme.background)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .cardStyle()

            // Save button
            Button { } label: {
                Text("Save Meal")
                    .font(.pillLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.theme.primary)
                    .clipShape(Capsule())
            }
        }
    }

    private func modeButton(icon: String, label: String, isSelected: Bool) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
            Text(label)
                .font(.pillLabel)
        }
        .foregroundStyle(isSelected ? .white : Color.theme.textSecondary)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(isSelected ? Color.theme.primary : Color.theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: isSelected ? .clear : .black.opacity(0.04), radius: 4)
    }

    private func mealTypeButton(meal: MealType, isSelected: Bool) -> some View {
        VStack(spacing: 4) {
            Image(systemName: meal.icon)
                .font(.system(size: 18))
            Text(meal.rawValue)
                .font(.system(size: 10, weight: .medium))
        }
        .foregroundStyle(isSelected ? Color.theme.primary : Color.theme.textMuted)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(isSelected ? Color.theme.tintPurple : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Drink Log

    private var drinkLog: some View {
        VStack(spacing: Layout.cardSpacing) {
            // Drink type grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(DrinkType.allCases, id: \.self) { drink in
                    drinkButton(type: drink, isSelected: drink == .beer)
                }
            }

            // Quantity stepper
            VStack(spacing: 12) {
                Text("How many?")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)

                HStack(spacing: 24) {
                    Button { } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color.theme.textMuted)
                    }

                    Text("1")
                        .font(.statLarge)
                        .foregroundStyle(Color.theme.textPrimary)
                        .frame(width: 60)

                    Button { } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color.theme.primary)
                    }
                }

                Text("2.3 units · 182 kcal")
                    .font(.cardBody)
                    .foregroundStyle(Color.theme.textSecondary)
            }
            .cardStyle()

            // Weekly total
            HStack {
                Text("This week:")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
                Spacer()
                Text("9.2 / 17 units")
                    .font(.statSmall)
                    .foregroundStyle(Color.theme.warning)
            }
            .cardStyle()

            // Add button
            Button { } label: {
                Text("Add Drink")
                    .font(.pillLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.theme.primary)
                    .clipShape(Capsule())
            }
        }
    }

    private func drinkButton(type: DrinkType, isSelected: Bool) -> some View {
        VStack(spacing: 6) {
            Text(type.icon)
                .font(.system(size: 28))
            Text(type.rawValue)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(isSelected ? Color.theme.primary : Color.theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(isSelected ? Color.theme.tintPurple : Color.theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(isSelected ? Color.theme.primary : Color.clear, lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.04), radius: 4)
    }

    // MARK: - Weight Log

    private var weightLog: some View {
        VStack(spacing: Layout.cardSpacing) {
            VStack(spacing: 16) {
                Text("Today's Weight")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)

                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("96.5")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.theme.textPrimary)
                    Text("kg")
                        .font(.cardTitle)
                        .foregroundStyle(Color.theme.textMuted)
                }

                HStack(spacing: 24) {
                    Button { } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color.theme.textMuted)
                    }

                    Text("Tap to adjust")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)

                    Button { } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color.theme.primary)
                    }
                }
            }
            .cardStyle()

            // Save button
            Button { } label: {
                Text("Save Weight")
                    .font(.pillLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.theme.primary)
                    .clipShape(Capsule())
            }
        }
    }
}

#Preview {
    LogScreen()
}
