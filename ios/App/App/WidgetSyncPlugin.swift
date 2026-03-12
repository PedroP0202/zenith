import Foundation
import Capacitor
import WidgetKit

@objc(WidgetSyncPlugin)
public class WidgetSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetSyncPlugin"
    public let jsName = "WidgetSyncPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeItem", returnType: CAPPluginReturnPromise),
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

    @objc func getItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key"),
              let group = call.getString("group")
        else {
            call.reject("Missing key or group")
            return
        }

        if let defaults = UserDefaults(suiteName: group) {
            let value = defaults.string(forKey: key)
            // If it's a dictionary, we might need a different get. 
            // But for our JSON system, string is fine.
            // If we stored it as dictionary in ToggleHabitIntent, let's try to convert back to JSON or just return dictionary.
            
            if let obj = defaults.object(forKey: key) {
                if let dict = obj as? [String: Any] {
                     call.resolve(["value": dict])
                } else if let str = obj as? String {
                     call.resolve(["value": str])
                } else {
                     call.resolve(["value": NSNull()])
                }
            } else {
                call.resolve(["value": NSNull()])
            }
        } else {
            call.reject("Could not initialize UserDefaults with App Group.")
        }
    }

    @objc func removeItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key"),
              let group = call.getString("group")
        else {
            call.reject("Missing key or group")
            return
        }

        if let defaults = UserDefaults(suiteName: group) {
            defaults.removeObject(forKey: key)
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
