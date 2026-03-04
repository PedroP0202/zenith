import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        
        // Manually inject our local custom Swift Widget Bridge Plugin directly into Capacitor 7
        bridge?.registerPluginInstance(WidgetSyncPlugin())
    }
}
