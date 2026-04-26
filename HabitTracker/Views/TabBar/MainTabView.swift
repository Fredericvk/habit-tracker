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
            if let store {
                Group {
                    switch selectedTab {
                    case .log:
                        LogScreen(store: store)
                    case .overview:
                        OverviewScreen(store: store)
                    case .goals:
                        GoalsScreen(store: store)
                    case .settings:
                        SettingsScreen()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            tabBar
        }
        .background(Color.theme.background)
        .onAppear {
            if store == nil {
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
                ZStack {
                    Circle()
                        .fill(Color.theme.primary)
                        .frame(width: 56, height: 56)
                        .shadow(color: Color.theme.primary.opacity(0.3), radius: 8, y: 4)

                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.white)
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
}
