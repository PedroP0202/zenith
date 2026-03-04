import Foundation
import Capacitor
import WidgetKit

@objc(WidgetSyncPlugin)
public class WidgetSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetSyncPlugin"
    public let jsName = "WidgetSyncPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadAllTimelines", returnType: CAPPluginReturnPromise)
    ]

    @objc func setItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key"),
              let group = call.getString("group"),
              let value = call.getString("value")
        else {
            call.reject("Missing key, group, or value")
            return
        }

        if let defaults = UserDefaults(suiteName: group) {
            defaults.set(value, forKey: key)
            call.resolve(["results": true])
        } else {
            call.reject("Could not initialize UserDefaults with App Group.")
        }
    }

    @objc func reloadAllTimelines(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve(["results": true])
        } else {
            call.reject("WidgetKit is only available on iOS 14+")
        }
    }
}
