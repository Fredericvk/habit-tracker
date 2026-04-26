import SwiftUI
import SwiftData

struct MainTabView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var selectedTab: Tab = .overview
    @State private var store: HabitStore?

    enum Tab: String {
        case log, overview, goals, settings
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // All tabs are kept alive in the hierarchy so onAppear fires only
            // once per session, preventing repeated SwiftData fetches on tab switch.
            ZStack {
                if let store {
                    LogScreen(store: store)
                        .opacity(selectedTab == .log ? 1 : 0)
                        .allowsHitTesting(selectedTab == .log)

                    OverviewScreen(store: store)
                        .opacity(selectedTab == .overview ? 1 : 0)
                        .allowsHitTesting(selectedTab == .overview)

                    GoalsScreen(store: store)
                        .opacity(selectedTab == .goals ? 1 : 0)
                        .allowsHitTesting(selectedTab == .goals)

                    SettingsScreen()
                        .opacity(selectedTab == .settings ? 1 : 0)
                        .allowsHitTesting(selectedTab == .settings)
                } else {
                    Color.theme.background
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            tabBar
        }
        .background(Color.theme.background)
        .task {
            if store == nil {
                // Seed default goals after the first frame to avoid blocking launch.
                DataSeeder.seedDefaultGoals(context: modelContext)
                store = HabitStore(modelContext: modelContext)
            }
        }
    }

    // MARK: - Custom Tab Bar

    private var tabBar: some View {
        HStack(spacing: 0) {
            tabItem(icon: "square.and.pencil", label: "Log", tab: .log)

            Spacer()

            // Center FAB button for Overview
            Button {
                withAnimation(.spring(response: 0.3)) {
                    selectedTab = .overview
                }
            } label: {
                VStack(spacing: 2) {
                    ZStack {
                        Circle()
                            .fill(Color.theme.primary)
                            .frame(width: 56, height: 56)
                            .shadow(color: Color.theme.primary.opacity(0.3), radius: 8, y: 4)

                        Image(systemName: "chart.bar.fill")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                    Text("Overview")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(selectedTab == .overview ? Color.theme.primary : Color.theme.textMuted)
                }
            }
            .offset(y: -16)

            Spacer()

            tabItem(icon: "target", label: "Goals", tab: .goals)
        }
        .padding(.horizontal, 32)
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea(edges: .bottom)
                .shadow(color: .black.opacity(0.05), radius: 12, y: -4)
        )
    }

    private func tabItem(icon: String, label: String, tab: Tab) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .medium))
                Text(label)
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(selectedTab == tab ? Color.theme.primary : Color.theme.textMuted)
        }
    }
}

#Preview {
    MainTabView()
        .modelContainer(PreviewContainer.container)
}
