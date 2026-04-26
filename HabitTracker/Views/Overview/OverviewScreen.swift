import SwiftUI

struct OverviewScreen: View {
    let store: HabitStore
    @State private var selectedSegment = 0
    private let segments = ["Day", "Week", "Month"]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Overview")
                    .font(.screenTitle)
                    .foregroundStyle(Color.theme.textPrimary)
                Spacer()
            }
            .padding(.horizontal, Layout.screenPadding)
            .padding(.top, 16)

            SegmentedPill(segments: segments, selected: $selectedSegment)
                .padding(.horizontal, Layout.screenPadding)
                .padding(.top, 12)

            TabView(selection: $selectedSegment) {
                DayView(store: store)
                    .tag(0)
                WeekView(store: store)
                    .tag(1)
                MonthView(store: store)
                    .tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeInOut(duration: 0.3), value: selectedSegment)

            Spacer(minLength: 80)
        }
        .background(Color.theme.background)
    }
}
