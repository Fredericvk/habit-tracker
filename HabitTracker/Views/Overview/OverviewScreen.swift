import SwiftUI

struct OverviewScreen: View {
    @State private var selectedSegment = 0
    private let segments = ["Day", "Week", "Month"]

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Overview")
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
            TabView(selection: $selectedSegment) {
                DayView()
                    .tag(0)
                WeekView()
                    .tag(1)
                MonthView()
                    .tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeInOut(duration: 0.3), value: selectedSegment)

            Spacer(minLength: 80)
        }
        .background(Color.theme.background)
    }
}

#Preview {
    OverviewScreen()
}
