import SwiftUI
import SwiftData

struct LogScreen: View {
    let store: HabitStore
    @State private var selectedSegment = 0
    private let segments = ["Food", "Drink", "Weight"]

    // Food state
    @State private var selectedMealType: MealType = .lunch
    @State private var foodDescription = ""
    @State private var foodKcal = ""
    @State private var isPhotoMode = false

    // Drink state
    @State private var selectedDrinkType: DrinkType = .beer
    @State private var drinkQuantity = 1

    // Weight state
    @State private var weightValue: Double = 96.5

    // Cached query results (populated in refreshData, not inside body)
    @State private var todayCal: Int = 0
    @State private var calorieGoalVal: Double = 2300
    @State private var weekUnits: Double = 0
    @State private var unitGoalVal: Double = 17
    @State private var weightGoalVal: Double? = nil

    // Feedback
    @State private var showSavedFeedback = false
    @State private var savedMessage = ""
    @State private var dismissTask: Task<Void, Never>? = nil

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Log")
                    .font(.screenTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 16)

            SegmentedPill(segments: segments, selected: $selectedSegment)
                .padding(.horizontal, Layout.screenPadding)
                .padding(.top, 12)

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
        .overlay {
            if showSavedFeedback {
                savedToast
            }
        }
        .onAppear { refreshData() }
        .onChange(of: store.dataVersion) { _, _ in refreshData() }
    }

    private func refreshData() {
        todayCal = store.totalCalories(for: .now)
        calorieGoalVal = store.cachedGoal(for: .calories)?.targetValue ?? 2300
        weekUnits = store.weeklyUnits(.now)
        unitGoalVal = store.cachedGoal(for: .alcohol)?.targetValue ?? 17
        weightGoalVal = store.cachedGoal(for: .weight)?.targetValue
    }

    // MARK: - Saved Toast

    private var savedToast: some View {
        VStack {
            Spacer()
            Text(savedMessage)
                .font(.pillLabel)
                .foregroundStyle(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(Color.theme.success)
                .clipShape(Capsule())
                .shadow(radius: 8)
                .padding(.bottom, 120)
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func showSaved(_ message: String) {
        savedMessage = message
        withAnimation(.spring(response: 0.3)) {
            showSavedFeedback = true
        }
        // Cancel any pending dismiss so rapid saves don't stack up timers.
        dismissTask?.cancel()
        dismissTask = Task {
            try? await Task.sleep(for: .seconds(1.5))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                withAnimation { showSavedFeedback = false }
            }
        }
    }

    // MARK: - Food Log

    private var foodLog: some View {
        VStack(spacing: Layout.cardSpacing) {
            HStack(spacing: Layout.cardSpacing) {
                // Meal type selector (Breakfast, Lunch, Dinner only)
                VStack(alignment: .leading, spacing: 10) {
                    Text("Meal")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)

                    HStack(spacing: 6) {
                        ForEach([MealType.breakfast, .lunch, .dinner], id: \.self) { meal in
                            mealTypeButton(meal: meal, isSelected: meal == selectedMealType) {
                                selectedMealType = meal
                            }
                        }
                    }
                }
                .cardStyle()

                // Snack card
                VStack(alignment: .leading, spacing: 10) {
                    Text("Snack")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)

                    mealTypeButton(meal: .snack, isSelected: selectedMealType == .snack) {
                        selectedMealType = .snack
                    }
                }
                .cardStyle()
            }

            // Input mode toggle
            HStack(spacing: 12) {
                modeButton(icon: "pencil", label: "Manual", isSelected: !isPhotoMode) {
                    isPhotoMode = false
                }
                modeButton(icon: "camera.fill", label: "Photo", isSelected: isPhotoMode) {
                    // Placeholder — no action for now
                }
            }

            // Food input (only shown in manual mode)
            if !isPhotoMode {
                VStack(alignment: .leading, spacing: 10) {
                    Text("What did you eat?")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)

                    TextField("e.g., Grilled chicken with rice", text: $foodDescription)
                        .textFieldStyle(.plain)
                        .padding(12)
                        .background(Color.theme.background)
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                    HStack {
                        Text("Est. Calories")
                            .font(.cardCaption)
                            .foregroundStyle(Color.theme.textMuted)
                        Spacer()
                        TextField("kcal", text: $foodKcal)
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
            }

            // Today's total — reads from cached state, no DB hit in body
            HStack {
                Text("Today so far:")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
                Spacer()
                Text("\(todayCal) / \(Int(calorieGoalVal)) kcal")
                    .font(.statSmall)
                    .foregroundStyle(Double(todayCal) > calorieGoalVal ? Color.theme.danger : Color.theme.success)
            }
            .cardStyle()

            // Save button
            Button {
                saveMeal()
            } label: {
                Text("Save \(selectedMealType == .snack ? "Snack" : "Meal")")
                    .font(.pillLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(foodDescription.isEmpty || isPhotoMode ? Color.theme.textMuted : Color.theme.primary)
                    .clipShape(Capsule())
            }
            .disabled(foodDescription.isEmpty || isPhotoMode)
        }
    }

    private func saveMeal() {
        let kcal = Int(foodKcal) ?? 0
        store.addMeal(date: .now, mealType: selectedMealType, description: foodDescription, kcal: kcal)
        foodDescription = ""
        foodKcal = ""
        showSaved("✅ \(selectedMealType.rawValue) saved!")
    }

    private func modeButton(icon: String, label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
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
    }

    private func mealTypeButton(meal: MealType, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
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
    }

    // MARK: - Drink Log

    private var drinkLog: some View {
        VStack(spacing: Layout.cardSpacing) {
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(DrinkType.allCases, id: \.self) { drink in
                    drinkButton(type: drink, isSelected: drink == selectedDrinkType) {
                        selectedDrinkType = drink
                        drinkQuantity = 1
                    }
                }
            }

            // Quantity stepper
            VStack(spacing: 12) {
                Text("How many?")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)

                HStack(spacing: 24) {
                    Button { if drinkQuantity > 1 { drinkQuantity -= 1 } } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(drinkQuantity > 1 ? Color.theme.primary : Color.theme.textMuted)
                    }

                    Text("\(drinkQuantity)")
                        .font(.statLarge)
                        .foregroundStyle(Color.theme.textPrimary)
                        .frame(width: 60)

                    Button { drinkQuantity += 1 } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color.theme.primary)
                    }
                }

                let units = selectedDrinkType.defaultUnits * Double(drinkQuantity)
                let kcal = selectedDrinkType.defaultKcal * drinkQuantity
                Text(String(format: "%.1f units · %d kcal", units, kcal))
                    .font(.cardBody)
                    .foregroundStyle(Color.theme.textSecondary)
            }
            .cardStyle()

            // Weekly total — reads from cached state, no DB hit in body
            HStack {
                Text("This week:")
                    .font(.cardCaption)
                    .foregroundStyle(Color.theme.textMuted)
                Spacer()
                Text(String(format: "%.1f / %.0f units", weekUnits, unitGoalVal))
                    .font(.statSmall)
                    .foregroundStyle(weekUnits > unitGoalVal ? Color.theme.danger : Color.theme.warning)
            }
            .cardStyle()

            Button {
                saveDrink()
            } label: {
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

    private func saveDrink() {
        store.addDrink(date: .now, type: selectedDrinkType, quantity: drinkQuantity)
        drinkQuantity = 1
        showSaved("✅ \(selectedDrinkType.rawValue) added!")
    }

    private func drinkButton(type: DrinkType, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
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
    }

    // MARK: - Weight Log

    private var weightLog: some View {
        VStack(spacing: Layout.cardSpacing) {
            VStack(spacing: 16) {
                Text("Today's Weight")
                    .font(.cardTitle)
                    .foregroundStyle(Color.theme.textPrimary)

                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(String(format: "%.1f", weightValue))
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.theme.textPrimary)
                    Text("kg")
                        .font(.cardTitle)
                        .foregroundStyle(Color.theme.textMuted)
                }

                HStack(spacing: 24) {
                    Button { weightValue = max(40, weightValue - 0.1) } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color.theme.textMuted)
                    }

                    Text("Tap to adjust")
                        .font(.cardCaption)
                        .foregroundStyle(Color.theme.textMuted)

                    Button { weightValue += 0.1 } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color.theme.primary)
                    }
                }

                // Reads from cached state — no DB hit in body
                if let goalVal = weightGoalVal {
                    let diff = weightValue - goalVal
                    Text(String(format: "%.1f kg to goal (%.1f kg)", abs(diff), goalVal))
                        .font(.cardCaption)
                        .foregroundStyle(diff > 0 ? Color.theme.warning : Color.theme.success)
                }
            }
            .cardStyle()

            Button {
                saveWeight()
            } label: {
                Text("Save Weight")
                    .font(.pillLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.theme.primary)
                    .clipShape(Capsule())
            }
        }
        .onAppear {
            if let latest = store.latestWeight() {
                weightValue = latest.weight
            }
        }
    }

    private func saveWeight() {
        store.addWeight(date: .now, weight: weightValue)
        showSaved("✅ Weight saved!")
    }
}

#Preview {
    LogScreen(store: HabitStore(modelContext: try! ModelContainer(for: Goal.self, MealEntry.self, DrinkEntry.self, WeightEntry.self, WorkoutEntry.self, Badge.self).mainContext))
}
