import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)

        // Create a container view controller to host a safe-area spacer and the Capacitor web view
        let containerVC = UIViewController()
        containerVC.view.backgroundColor = .systemBackground

        // Top spacer to ensure content sits below the Dynamic Island/notch
        let topSpacer = UIView()
        topSpacer.translatesAutoresizingMaskIntoConstraints = false
        topSpacer.backgroundColor = .clear // transparent spacer

        // Capacitor bridge view controller (web content)
        let bridgeVC = CAPBridgeViewController()
        bridgeVC.view.translatesAutoresizingMaskIntoConstraints = false
        bridgeVC.edgesForExtendedLayout = []
        if #available(iOS 11.0, *) {
            bridgeVC.additionalSafeAreaInsets.top = 0 // spacer will control the gap
        }

        // Build view hierarchy
        containerVC.addChild(bridgeVC)
        containerVC.view.addSubview(topSpacer)
        containerVC.view.addSubview(bridgeVC.view)
        bridgeVC.didMove(toParent: containerVC)

        // Layout constraints: spacer at top within safe area; bridge fills below spacer
        let guide = containerVC.view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            // Spacer height controls the visible gap below the Dynamic Island
            topSpacer.topAnchor.constraint(equalTo: guide.topAnchor),
            topSpacer.leadingAnchor.constraint(equalTo: containerVC.view.leadingAnchor),
            topSpacer.trailingAnchor.constraint(equalTo: containerVC.view.trailingAnchor),
            topSpacer.heightAnchor.constraint(equalToConstant: 16),

            // Bridge view below spacer, pinned to edges and bottom safe area
            bridgeVC.view.topAnchor.constraint(equalTo: topSpacer.bottomAnchor),
            bridgeVC.view.leadingAnchor.constraint(equalTo: containerVC.view.leadingAnchor),
            bridgeVC.view.trailingAnchor.constraint(equalTo: containerVC.view.trailingAnchor),
            bridgeVC.view.bottomAnchor.constraint(equalTo: guide.bottomAnchor)
        ])

        window?.rootViewController = containerVC
        window?.makeKeyAndVisible()

        // Enable the iOS edge-swipe gesture so it navigates back/forward through
        // the web view's history (previous page it was opened from).
        // The bridge's WKWebView is created during the bridge VC's viewDidLoad,
        // which has already run because we accessed `bridgeVC.view` above.
        bridgeVC.webView?.allowsBackForwardNavigationGestures = true

        // Removed SceneDelegateProxy calls — type not present in project. If needed, re-add after implementing or importing it.
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {

    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {

    }
}
